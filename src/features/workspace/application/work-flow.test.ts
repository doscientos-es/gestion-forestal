import { describe, expect, it } from 'vitest'

import { parseCsv } from '@/shared/lib/csv'

import { buildSeed } from '../infrastructure/build-seed'
import { budgetTracking } from './activity'
import { estimateStoredBudget } from './budget-calculation'
import { budgetCsvTemplate, importBudgets, parseBudgetCsv } from './budget-import'
import {
  CommandError,
  acceptBudget,
  createClient,
  createInvoiceDraft,
  createZone,
  moveAssignment,
  removeAssignment,
  saveBudget,
  scheduleWork,
  setBudgetStatus,
  setInvoiceStatus,
  submitReport,
  type Context,
} from './commands'
import { invoiceTotals } from './invoice-draft'
import { findConflicts, suggestedEnd } from './planning'
import { proposalLines } from './proposal'
import { recordBudgetView, sendBudgetEmail, sendInvoiceEmail } from './sharing'
import { calculatePerformance } from './work-performance'
import { availableYears, summarizeYear } from './year-comparison'

const TODAY = '2026-11-04'
let sequence = 0
const context: Context = {
  id: () => `id-${(sequence += 1)}`,
  today: TODAY,
  now: `${TODAY}T10:30:00.000Z`,
  actorId: 'p-nerea',
}

describe('clients and zones', () => {
  const workspace = buildSeed(TODAY)

  it('adds a client and a zone to the catalogue', () => {
    const withClient = createClient(
      workspace,
      { name: ' Ayuntamiento Nuevo ', kind: 'ayuntamiento', taxId: ' P1 ', town: 'Aldea' },
      context,
    )
    expect(withClient.client).toMatchObject({ name: 'Ayuntamiento Nuevo', taxId: 'P1' })
    expect(withClient.workspace.clients).toHaveLength(workspace.clients.length + 1)
    const withZone = createZone(withClient.workspace, 'Valle Alto', context)
    expect(withZone.workspace.zones[0]).toEqual(withZone.zone)
  })

  it('rejects empty and duplicated names', () => {
    const existing = workspace.zones[0]?.name ?? ''
    expect(() => createZone(workspace, '  ', context)).toThrow(CommandError)
    expect(() => createZone(workspace, existing.toUpperCase(), context)).toThrow(CommandError)
    expect(() =>
      createClient(workspace, { name: '', kind: 'empresa', taxId: '', town: '' }, context),
    ).toThrow(CommandError)
  })
})

describe('changing the plan', () => {
  const workspace = buildSeed(TODAY)
  const assignment = workspace.assignments[0]
  const otherCrew = workspace.crews.find((crew) => crew.id !== assignment?.crewId)

  it('moves an assignment, rejects overlaps and notifies the crews', () => {
    if (!assignment || !otherCrew) throw new Error('seed needs assignments and two crews')
    const moved = moveAssignment(
      workspace,
      assignment.id,
      { crewId: assignment.crewId, start: assignment.start, end: assignment.end },
      context,
    )
    expect(moved.notifications.length).toBeGreaterThan(workspace.notifications.length)
    const taken = workspace.assignments.find(
      (item) => item.crewId === otherCrew.id && item.id !== assignment.id,
    )
    if (taken)
      expect(() =>
        moveAssignment(
          workspace,
          assignment.id,
          { crewId: otherCrew.id, start: taken.start, end: taken.end },
          context,
        ),
      ).toThrow(CommandError)
    expect(() =>
      moveAssignment(
        workspace,
        assignment.id,
        { crewId: assignment.crewId, start: '2026-12-02', end: '2026-12-01' },
        context,
      ),
    ).toThrow(CommandError)
  })

  it('removes an assignment and tells the crew', () => {
    if (!assignment) throw new Error('seed needs assignments')
    const next = removeAssignment(workspace, assignment.id, context)
    expect(next.assignments.some((item) => item.id === assignment.id)).toBe(false)
    expect(next.notifications[0]?.kind).toBe('obra_cambiada')
  })
})

describe('demo seed', () => {
  const workspace = buildSeed(TODAY)

  it('is deterministic', () => {
    expect(buildSeed(TODAY)).toEqual(workspace)
  })

  it('covers two seasons so years can be compared', () => {
    expect(availableYears(workspace)).toEqual([2025, 2026])
    const [previous, current] = [summarizeYear(workspace, 2025), summarizeYear(workspace, 2026)]
    expect(previous.revenue).toBeGreaterThan(0)
    expect(current.works).toBeGreaterThan(0)
    expect(previous.actualYield).toBeGreaterThan(0)
  })

  it('never reports beyond the budgeted plants nor in the future', () => {
    for (const work of workspace.works) {
      const performance = calculatePerformance(work, workspace.reports, workspace.people)
      expect(performance.plants).toBeLessThanOrEqual(work.planned.plants)
    }
    expect(workspace.reports.every((report) => report.date < TODAY)).toBe(true)
  })

  it('shows the hero work below budgeted yield and a planning conflict with holidays', () => {
    const hero = workspace.works.find((work) => work.title === 'Maderas del Norte · parcela 14')
    if (!hero) throw new Error('missing hero work')
    const performance = calculatePerformance(hero, workspace.reports, workspace.people)
    expect(hero.status).toBe('en_curso')
    expect(performance.yieldDeviation).toBeLessThan(-0.05)
    expect(performance.projectedMargin).toBeLessThan(performance.plannedMargin)

    const planned = workspace.works.find((work) => work.status === 'planificada')
    const assignment = workspace.assignments.find((item) => item.workId === planned?.id)
    if (!assignment) throw new Error('missing planned assignment')
    const conflicts = findConflicts(
      assignment,
      workspace.assignments,
      workspace.people,
      workspace.absences,
    )
    expect(conflicts.some((conflict) => conflict.kind === 'ausencia')).toBe(true)
  })
})

describe('budget → work → report → invoice', () => {
  it('runs the full flow and keeps billing within the budgeted price', () => {
    let workspace = buildSeed(TODAY)
    const saved = saveBudget(
      workspace,
      {
        title: 'Obra de prueba',
        clientId: 'c-valdemonte',
        zoneId: 'z-norte',
        date: TODAY,
        notes: '',
        params: { crewSize: 5, dailyCost: 16_000, travelPerCrewDay: 9_000, targetMargin: 0.2 },
        lines: [
          {
            id: 'l',
            kind: 'plantacion',
            speciesId: 's-radiata',
            hectares: 2,
            density: 1000,
            yieldPerDay: 400,
          },
        ],
      },
      context,
    )
    expect(saved.budget.number).toMatch(/^P-2026-\d{3}$/)
    const accepted = acceptBudget(saved.workspace, saved.budget.id, context)
    workspace = accepted.workspace
    expect(() => acceptBudget(workspace, saved.budget.id, context)).toThrow(CommandError)

    const start = '2026-11-09'
    workspace = scheduleWork(
      workspace,
      {
        workId: accepted.work.id,
        crewId: 'cr-sur',
        start,
        end: suggestedEnd(accepted.work, start),
      },
      context,
    )
    expect(workspace.works.find((work) => work.id === accepted.work.id)?.status).toBe('planificada')

    const report = {
      workId: accepted.work.id,
      crewId: 'cr-sur',
      date: start,
      workerIds: ['p-javier', 'p-mikel', 'p-laura', 'p-sergio', 'p-asier'],
      plants: 1000,
      hectares: 1,
      incident: 'ninguna' as const,
      notes: '',
      authorId: 'p-javier',
    }
    workspace = submitReport(workspace, report, context)
    workspace = submitReport(workspace, { ...report, plants: 1100 }, context)
    expect(workspace.reports.filter((item) => item.workId === accepted.work.id)).toHaveLength(1)

    const first = createInvoiceDraft(workspace, accepted.work.id, context)
    expect(first.invoice.kind).toBe('avance')
    expect(first.invoice.progressTo).toBeCloseTo(0.55)
    expect(() => createInvoiceDraft(first.workspace, accepted.work.id, context)).toThrow(
      CommandError,
    )

    const work = first.workspace.works.find((item) => item.id === accepted.work.id)
    if (!work) throw new Error('missing work')
    const finished = {
      ...first.workspace,
      works: first.workspace.works.map((item) =>
        item.id === work.id ? { ...item, status: 'terminada' as const } : item,
      ),
    }
    const final = createInvoiceDraft(finished, work.id, context)
    const billed = final.workspace.invoices
      .filter((invoice) => invoice.workId === work.id)
      .reduce((sum, invoice) => sum + invoiceTotals(invoice).base, 0)
    expect(billed).toBe(work.planned.price)
    expect(final.workspace.works.find((item) => item.id === work.id)?.status).toBe('facturada')
  })
})

describe('sending proposals and following them up', () => {
  const workspace = buildSeed(TODAY)
  const draft = workspace.budgets.find((budget) => budget.status === 'borrador')
  const email = { to: 'cliente@example.org', subject: 'Propuesta', message: 'Hola' }

  it('seeds a follow-up history for the proposal that is waiting for an answer', () => {
    const sent = workspace.budgets.find((budget) => budget.id === 'b-open-1')
    if (!sent) throw new Error('missing sent budget')
    const tracking = budgetTracking(workspace.activity, sent.id)
    expect(tracking.sentAt).not.toBeNull()
    expect(tracking.views).toBe(3)
  })

  it('moves a draft to sent, records the recipient and counts client views', () => {
    if (!draft) throw new Error('missing draft')
    const sent = sendBudgetEmail(workspace, draft.id, email, context)
    expect(sent.budgets.find((budget) => budget.id === draft.id)?.status).toBe('enviado')
    const viewed = recordBudgetView(recordBudgetView(sent, draft.id, context), draft.id, context)
    expect(budgetTracking(viewed.activity, draft.id)).toMatchObject({
      sentTo: 'cliente@example.org',
      sentCount: 1,
      views: 2,
    })
    expect(viewed.activity[0]).toMatchObject({ kind: 'presupuesto_visto', actorId: null })
    expect(sent.activity[0]).toMatchObject({ kind: 'presupuesto_enviado', actorId: 'p-nerea' })
  })

  it('rejects invalid addresses and proposals that already have an answer', () => {
    if (!draft) throw new Error('missing draft')
    expect(() =>
      sendBudgetEmail(workspace, draft.id, { ...email, to: 'sin-arroba' }, context),
    ).toThrow(CommandError)
    const accepted = workspace.budgets.find((budget) => budget.status === 'aceptado')
    if (!accepted) throw new Error('missing accepted budget')
    expect(() => sendBudgetEmail(workspace, accepted.id, email, context)).toThrow(CommandError)
  })

  it('logs status changes once and ignores unknown links', () => {
    if (!draft) throw new Error('missing draft')
    const rejected = setBudgetStatus(workspace, draft.id, 'rechazado', context)
    expect(rejected.activity[0]?.kind).toBe('presupuesto_rechazado')
    expect(setBudgetStatus(rejected, draft.id, 'rechazado', context)).toBe(rejected)
    expect(recordBudgetView(workspace, 'does-not-exist', context)).toBe(workspace)
  })

  it('logs invoice hand-over, payment and email copies', () => {
    const finished = workspace.works.find((work) => work.status === 'terminada')
    if (!finished) throw new Error('missing finished work')
    const created = createInvoiceDraft(workspace, finished.id, context)
    expect(created.workspace.activity[0]?.kind).toBe('factura_creada')
    const id = created.invoice.id
    const handed = setInvoiceStatus(created.workspace, [id], 'enviada', context)
    expect(handed.activity[0]?.kind).toBe('factura_enviada_gestoria')
    expect(setInvoiceStatus(handed, [id], 'enviada', context).activity).toHaveLength(
      handed.activity.length,
    )
    const paid = setInvoiceStatus(handed, [id], 'cobrada', context)
    expect(paid.activity[0]?.kind).toBe('factura_cobrada')
    const mailed = sendInvoiceEmail(paid, id, email, context)
    expect(mailed.activity[0]).toMatchObject({ kind: 'factura_enviada_cliente', summary: email.to })
  })

  it('shows the client lines that add up to the sale price without internal costs', () => {
    for (const budget of workspace.budgets.slice(0, 8)) {
      const lines = proposalLines(budget, workspace.species)
      const { price } = estimateStoredBudget(budget, workspace.species)
      expect(lines.reduce((sum, line) => sum + line.amount, 0)).toBe(price)
      expect(lines.every((line) => line.amount > 0)).toBe(true)
    }
  })
})

describe('CSV', () => {
  const workspace = buildSeed(TODAY)
  const PARAMS = { crewSize: 5, dailyCost: 16_000, travelPerCrewDay: 9_000, targetMargin: 0.2 }

  it('reads quoted cells, either delimiter and blank rows', () => {
    expect(parseCsv('\uFEFFa;b\r\n"x;y";"say ""hi"""\n\n1,5;2')).toEqual([
      ['a', 'b'],
      ['x;y', 'say "hi"'],
      ['1,5', '2'],
    ])
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('imports the template as one draft budget and creates the missing client and zone', () => {
    const preview = parseBudgetCsv(budgetCsvTemplate(workspace), workspace)
    expect(preview.issues).toEqual([])
    expect(preview.budgets).toHaveLength(1)
    expect(preview.budgets[0]?.lines).toHaveLength(2)
    const text = [
      'Obra;Cliente;Zona;Tipo;Especie o tarea;Hectáreas;Densidad (pl/ha);Rendimiento',
      'Parcela A;Cliente Nuevo S.L.;Zona Nueva;plantación;Pino radiata;"1.250,5";1600;420',
      'Parcela B;Cliente Nuevo S.L.;Zona Nueva;tratamiento;Desbroce;3;;0,5',
    ].join('\n')
    const imported = parseBudgetCsv(text, workspace)
    expect(imported.budgets.map((budget) => budget.title)).toEqual(['Parcela A', 'Parcela B'])
    const result = importBudgets(workspace, imported.budgets, PARAMS, context)
    expect(result.budgets).toHaveLength(2)
    expect(result.workspace.clients.filter((c) => c.name === 'Cliente Nuevo S.L.')).toHaveLength(1)
    expect(result.workspace.zones.filter((z) => z.name === 'Zona Nueva')).toHaveLength(1)
    expect(result.workspace.activity[0]?.kind).toBe('presupuesto_importado')
  })

  it('reports each wrong row and skips the whole work it belongs to', () => {
    const text = [
      'Parcela A;Ayuntamiento de Valdemonte;Valle Norte;plantación;Especie inventada;5;1000;300',
      'Parcela A;Ayuntamiento de Valdemonte;Valle Norte;tratamiento;Desbroce;5;;0,5',
      'Parcela B;Ayuntamiento de Valdemonte;Valle Norte;riego;Agua;5;;1',
      'Parcela C;Ayuntamiento de Valdemonte;Valle Norte;tratamiento;Desbroce;2;;0,5',
    ].join('\n')
    const preview = parseBudgetCsv(text, workspace)
    expect(preview.issues.map((issue) => issue.line)).toEqual([1, 3])
    expect(preview.budgets.map((budget) => budget.title)).toEqual(['Parcela C'])
    expect(() => importBudgets(workspace, [], PARAMS, context)).toThrow(CommandError)
  })
})
