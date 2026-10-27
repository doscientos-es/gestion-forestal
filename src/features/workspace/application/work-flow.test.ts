import { describe, expect, it } from 'vitest'

import { parseCsv } from '@/shared/lib/csv'

import { buildSeed } from '../infrastructure/build-seed'
import { absenceImpact, monthGrid, vacationRows } from './absence-calendar'
import {
  accountingYears,
  monthlyAccounts,
  periodTotals,
  quarterOf,
  quarterlyComparison,
} from './accounting'
import { budgetTracking } from './activity'
import { estimateStoredBudget } from './budget-calculation'
import { budgetCsvTemplate, importBudgets, parseBudgetCsv } from './budget-import'
import {
  CommandError,
  acceptBudget,
  cancelAbsence,
  createClient,
  createInvoiceDraft,
  createZone,
  moveAssignment,
  removeAssignment,
  requestAbsence,
  saveBudget,
  scheduleWork,
  setBudgetStatus,
  setInvoiceStatus,
  submitReport,
  type Context,
} from './commands'
import {
  addWorker,
  createCrew,
  dissolveCrew,
  moveWorker,
  renameCrew,
  setForeman,
  updateWorker,
} from './crew-management'
import { crewProfitability } from './crew-profitability'
import { invoiceTotals } from './invoice-draft'
import type { Workspace } from './model'
import { freshNotices, notificationTarget, notificationUrl } from './notification-target'
import { findConflicts, suggestedEnd } from './planning'
import { proposalLines } from './proposal'
import {
  recordBudgetView,
  recordWorkReportView,
  respondToBudget,
  sendBudgetEmail,
  sendInvoiceEmail,
  sendWorkReportEmail,
} from './sharing'
import { callLink, dialNumber, whatsappLink } from './whatsapp'
import { marginAlerts } from './work-alerts'
import { calculatePerformance } from './work-performance'
import { clientWorkReport } from './work-report'
import { availableYears, summarizeYear } from './year-comparison'
import { historicYield, suggestedYield } from './yield-history'

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
      {
        name: ' Ayuntamiento Nuevo ',
        kind: 'ayuntamiento',
        taxId: ' P1 ',
        town: 'Aldea',
      },
      context,
    )
    expect(withClient.client).toMatchObject({
      name: 'Ayuntamiento Nuevo',
      taxId: 'P1',
    })
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
      {
        crewId: assignment.crewId,
        start: assignment.start,
        end: assignment.end,
      },
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
        params: {
          crewSize: 5,
          dailyCost: 16_000,
          travelPerCrewDay: 9_000,
          targetMargin: 0.2,
        },
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
      photos: [],
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
  const email = {
    to: 'cliente@example.org',
    subject: 'Propuesta',
    message: 'Hola',
  }

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
    expect(viewed.activity[0]).toMatchObject({
      kind: 'presupuesto_visto',
      actorId: null,
    })
    expect(sent.activity[0]).toMatchObject({
      kind: 'presupuesto_enviado',
      actorId: 'p-nerea',
    })
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
    expect(mailed.activity[0]).toMatchObject({
      kind: 'factura_enviada_cliente',
      summary: email.to,
    })
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

describe('client answers from the public link', () => {
  const workspace = buildSeed(TODAY)
  const sent = workspace.budgets.find((budget) => budget.id === 'b-open-1')
  const draft = workspace.budgets.find((budget) => budget.status === 'borrador')

  it('accepting creates the work, attributes it to the client and notifies the office', () => {
    if (!sent) throw new Error('missing sent budget')
    const result = respondToBudget(workspace, sent.id, 'aceptado', context)
    expect(result.work?.budgetId).toBe(sent.id)
    expect(result.workspace.budgets.find((b) => b.id === sent.id)?.status).toBe('aceptado')
    expect(result.workspace.activity[0]).toMatchObject({
      kind: 'presupuesto_aceptado',
      actorId: null,
    })
    expect(result.workspace.notifications[0]).toMatchObject({
      kind: 'presupuesto_respondido',
      personId: 'p-nerea',
    })
  })

  it('declining logs a rejection and nothing can be answered twice or before sending', () => {
    if (!sent || !draft) throw new Error('missing budgets')
    const declined = respondToBudget(workspace, sent.id, 'rechazado', context).workspace
    expect(declined.activity[0]).toMatchObject({
      kind: 'presupuesto_rechazado',
      actorId: null,
    })
    expect(() => respondToBudget(declined, sent.id, 'aceptado', context)).toThrow(CommandError)
    expect(() => respondToBudget(workspace, draft.id, 'aceptado', context)).toThrow(CommandError)
  })
})

describe('margin alerts and WhatsApp links', () => {
  const workspace = buildSeed(TODAY)

  it('warns about the work running below budgeted yield and ignores healthy ones', () => {
    const alerts = marginAlerts(workspace)
    const hero = alerts.find((alert) => alert.work.title === 'Maderas del Norte · parcela 14')
    expect(hero).toBeDefined()
    expect(hero?.projectedRate).toBeLessThan(hero?.plannedRate ?? 0)
    expect(hero?.lostMargin).toBeGreaterThan(0)
    expect(alerts.every((alert) => alert.work.status === 'en_curso')).toBe(true)
  })

  it('builds wa.me links with country code and encoded text', () => {
    expect(whatsappLink('+34 600 000 001', 'Hola, ¿qué tal?')).toBe(
      'https://wa.me/34600000001?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F',
    )
    expect(dialNumber('600000001')).toBe('34600000001')
    expect(whatsappLink('123', 'x')).toBeNull()
    expect(callLink('')).toBeNull()
    expect(workspace.people.every((person) => dialNumber(person.phone) !== null)).toBe(true)
  })
})

describe('client work report and yield suggestions', () => {
  const workspace = buildSeed(TODAY)
  const withPhotos = workspace.works.find((work) =>
    workspace.reports.some((report) => report.workId === work.id && report.photos.length > 0),
  )
  const email = { to: 'cliente@example.org', subject: 'Informe', message: '' }

  it('shows progress, diary and photos newest first, capped at 100 %', () => {
    if (!withPhotos) throw new Error('seed needs a work with photos')
    const report = clientWorkReport(withPhotos, workspace)
    expect(report.progress).toBeLessThanOrEqual(1)
    expect(report.photos.length).toBeGreaterThan(0)
    const diary = report.days.map((day) => day.date)
    expect(diary).toEqual([...diary].sort((a, b) => a.localeCompare(b)))
    const dates = report.photos.map((item) => item.date)
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)))
    expect(JSON.stringify(report)).not.toContain('dailyCost')
  })

  it('records the email and the client views against the work', () => {
    if (!withPhotos) throw new Error('seed needs a work with photos')
    const sent = sendWorkReportEmail(workspace, withPhotos.id, email, context)
    expect(sent.activity[0]).toMatchObject({
      kind: 'informe_enviado',
      entity: 'work',
    })
    const viewed = recordWorkReportView(sent, withPhotos.id, context)
    expect(viewed.activity[0]).toMatchObject({
      kind: 'informe_visto',
      actorId: null,
    })
    expect(recordWorkReportView(workspace, 'nope', context)).toBe(workspace)
    expect(() =>
      sendWorkReportEmail(workspace, withPhotos.id, { ...email, to: 'x' }, context),
    ).toThrow(CommandError)
  })

  it('suggests the real yield when there is history and the typical one otherwise', () => {
    const species = workspace.species.find((item) => historicYield(workspace, item.id))
    if (!species) throw new Error('seed needs a species with finished works')
    const real = suggestedYield(workspace, species.id, 999)
    expect(real.source).toBe('real')
    expect(real.value % 5).toBe(0)
    expect(real.value).not.toBe(999)
    expect(suggestedYield({ ...workspace, works: [] }, species.id, 300)).toEqual({
      value: 300,
      source: 'tipico',
      works: 0,
    })
  })
})

describe('alerts for the device', () => {
  const workspace = buildSeed(TODAY)
  // A proposal nobody has opened yet (the sent ones in the seed already have views).
  const budget = workspace.budgets.find(
    (item) =>
      !workspace.activity.some((e) => e.kind === 'presupuesto_visto' && e.entityId === item.id),
  )
  const work = workspace.works[0]

  it('alerts the office the first time the client opens a proposal or a report, not after', () => {
    if (!budget || !work) throw new Error('seed needs a budget and a work')
    const first = recordBudgetView(workspace, budget.id, context)
    expect(first.notifications[0]).toMatchObject({
      kind: 'propuesta_vista',
      personId: 'p-nerea',
      budgetId: budget.id,
    })
    const again = recordBudgetView(first, budget.id, context)
    expect(again.notifications).toHaveLength(first.notifications.length)
    const report = recordWorkReportView(workspace, work.id, context)
    expect(report.notifications[0]).toMatchObject({
      kind: 'informe_visto',
      workId: work.id,
    })
    expect(recordWorkReportView(report, work.id, context).notifications).toHaveLength(
      report.notifications.length,
    )
  })

  it('opens the screen each notice is about', () => {
    expect(
      notificationTarget({
        kind: 'gasto_pendiente',
        workId: 'w',
        budgetId: null,
      }),
    ).toEqual({
      to: '/gastos',
    })
    expect(
      notificationTarget({
        kind: 'propuesta_vista',
        workId: null,
        budgetId: 'b1',
      }),
    ).toEqual({
      to: '/presupuestos/$budgetId',
      params: { budgetId: 'b1' },
    })
    expect(
      notificationTarget({
        kind: 'obra_asignada',
        workId: 'w1',
        budgetId: null,
      }),
    ).toEqual({
      to: '/obras/$workId',
      params: { workId: 'w1' },
    })
    expect(
      notificationTarget({
        kind: 'ausencia_resuelta',
        workId: null,
        budgetId: null,
      }),
    ).toEqual({
      to: '/ausencias',
    })
    expect(notificationTarget({ kind: 'tarea_nueva', workId: null, budgetId: null })).toBeNull()
    expect(
      notificationUrl({
        kind: 'propuesta_vista',
        workId: null,
        budgetId: 'b1',
      }),
    ).toBe('/presupuestos/b1')
    expect(notificationUrl({ kind: 'obra_asignada', workId: 'w1', budgetId: null })).toBe(
      '/obras/w1',
    )
    expect(notificationUrl({ kind: 'tarea_nueva', workId: null, budgetId: null })).toBe('/avisos')
  })

  it('never replays the backlog and only reports unread notices it has not shown', () => {
    const mine = workspace.notifications.filter((item) => item.personId === 'p-nerea')
    const firstRun = freshNotices(workspace.notifications, 'p-nerea', null)
    expect(firstRun.fresh).toEqual([])
    expect(firstRun.seen).toEqual(mine.map((item) => item.id))
    expect(freshNotices(workspace.notifications, 'p-nerea', firstRun.seen).fresh).toEqual([])
    if (!budget) throw new Error('seed needs a budget')
    const after = recordBudgetView(workspace, budget.id, context).notifications
    const next = freshNotices(after, 'p-nerea', firstRun.seen)
    expect(next.fresh.map((item) => item.kind)).toEqual(['propuesta_vista'])
    expect(next.unread).toBe(firstRun.unread + 1)
    expect(
      freshNotices(after, 'p-javier', []).fresh.every((item) => item.personId === 'p-javier'),
    ).toBe(true)
  })
})

describe('team absence calendar', () => {
  const seeded = buildSeed(TODAY)
  /** No absences, so every case starts from a clean calendar. */
  const base: Workspace = { ...seeded, absences: [] }
  const crew = base.crews[0]
  const members = base.people.filter((person) => person.crewId === crew?.id)
  const request = (personId: string) => ({
    personId,
    type: 'vacaciones' as const,
    start: '2027-02-01',
    end: '2027-02-05',
    note: '',
  })

  it('flags overlaps and understaffing from the same crew, ignoring other crews', () => {
    let workspace = base
    for (const member of members.slice(0, 3))
      workspace = requestAbsence(workspace, request(member.id), context)
    const last = workspace.absences[0]
    if (!last) throw new Error('missing absence')
    const impact = absenceImpact(last, workspace)
    expect(impact?.overlapping).toHaveLength(2)
    expect(impact?.minAvailable).toBe(members.length - 3)
    expect(impact?.understaffed).toBe(true)

    const other = base.people.find((person) => person.crewId && person.crewId !== crew?.id)
    if (!other) throw new Error('missing other crew')
    const alone = requestAbsence(base, request(other.id), context)
    expect(absenceImpact(alone.absences[0] ?? last, alone)?.overlapping).toHaveLength(0)
  })

  it('splits vacation days into approved, pending and remaining', () => {
    const person = members[0]
    if (!person) throw new Error('missing person')
    let workspace = base
    workspace = requestAbsence(
      workspace,
      { ...request(person.id), start: '2026-12-07', end: '2026-12-11' },
      context,
      true,
    )
    workspace = requestAbsence(
      workspace,
      { ...request(person.id), start: '2026-12-14', end: '2026-12-15' },
      context,
    )
    const row = vacationRows(workspace, 2026).find((item) => item.person.id === person.id)
    expect(row).toMatchObject({ approved: 5, pending: 2, remaining: 22 - 7 })
    expect(vacationRows(workspace, 2026).some((item) => item.person.role === 'admin')).toBe(false)
  })

  it('builds Monday-first weeks and rates each day by how many are away', () => {
    const crewIds = [crew?.id ?? '']
    let workspace = base
    for (const member of members.slice(0, 2))
      workspace = requestAbsence(workspace, request(member.id), context)
    const weeks = monthGrid(2027, 2, crewIds, workspace)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    expect(weeks[0]?.[0]?.date).toBe('2027-02-01')
    const byDate = new Map(weeks.flat().map((day) => [day.date, day]))
    expect(byDate.get('2027-02-01')).toMatchObject({
      inMonth: true,
      load: 'varios',
    })
    expect(byDate.get('2027-02-01')?.away).toHaveLength(2)
    expect(byDate.get('2027-02-06')).toMatchObject({
      weekend: true,
      load: 'libre',
    })
    expect(byDate.get('2027-02-08')?.away).toHaveLength(0)
    expect(weeks.flat().at(-1)?.date).toBe('2027-02-28')

    for (const member of members.slice(2, 3))
      workspace = requestAbsence(workspace, request(member.id), context)
    const loaded = monthGrid(2027, 2, crewIds, workspace).flat()
    expect(loaded.find((day) => day.date === '2027-02-03')?.load).toBe('critico')
    // Another crew's calendar is unaffected.
    const other = base.crews.find((item) => item.id !== crew?.id)
    expect(
      monthGrid(2027, 2, [other?.id ?? ''], workspace)
        .flat()
        .every((day) => day.away.length === 0),
    ).toBe(true)
  })
})

describe('crews and workers', () => {
  const base = buildSeed(TODAY)
  const [crew, otherCrew] = base.crews
  if (!crew || !otherCrew) throw new Error('seed needs two crews')
  const worker = base.people.find((p) => p.crewId === crew.id && p.id !== crew.foremanId)
  if (!worker) throw new Error('seed needs a worker')
  const input = {
    name: 'Nuevo Peón',
    phone: '+34 600 111 222',
    email: '',
    dailyCost: 15_000,
  }

  it('adds a worker into a crew and tells them; rejects bad data', () => {
    const { workspace, person } = addWorker(base, { ...input, crewId: crew.id }, context)
    expect(person).toMatchObject({
      role: 'peon',
      crewId: crew.id,
      initials: 'NP',
    })
    expect(workspace.notifications[0]).toMatchObject({
      kind: 'cuadrilla_cambiada',
      personId: person.id,
    })
    expect(addWorker(base, { ...input, crewId: null }, context).person.crewId).toBeNull()
    expect(() => addWorker(base, { ...input, name: ' ', crewId: null }, context)).toThrow(
      CommandError,
    )
    expect(() => addWorker(base, { ...input, name: worker.name, crewId: null }, context)).toThrow(
      CommandError,
    )
    expect(() => addWorker(base, { ...input, dailyCost: 0, crewId: null }, context)).toThrow(
      CommandError,
    )
    expect(() => addWorker(base, { ...input, email: 'sin-arroba', crewId: null }, context)).toThrow(
      CommandError,
    )
  })

  it('edits contact data and cost', () => {
    const next = updateWorker(base, worker.id, {
      ...input,
      name: 'Otro Nombre',
    })
    expect(next.people.find((p) => p.id === worker.id)).toMatchObject({
      name: 'Otro Nombre',
      initials: 'ON',
      dailyCost: 15_000,
    })
  })

  it('moves a worker, notifies them and keeps the foreman in place', () => {
    const moved = moveWorker(base, worker.id, otherCrew.id, context)
    expect(moved.people.find((p) => p.id === worker.id)?.crewId).toBe(otherCrew.id)
    expect(moved.notifications[0]).toMatchObject({
      kind: 'cuadrilla_cambiada',
      personId: worker.id,
    })
    expect(
      moveWorker(moved, worker.id, null, context).people.find((p) => p.id === worker.id)?.crewId,
    ).toBeNull()
    expect(moveWorker(base, worker.id, crew.id, context)).toBe(base)
    expect(() => moveWorker(base, crew.foremanId, otherCrew.id, context)).toThrow(CommandError)
    expect(() => moveWorker(base, 'p-nerea', crew.id, context)).toThrow(CommandError)
  })

  it('swaps the foreman and their roles', () => {
    const next = setForeman(base, crew.id, worker.id, context)
    expect(next.crews.find((c) => c.id === crew.id)?.foremanId).toBe(worker.id)
    expect(next.people.find((p) => p.id === worker.id)).toMatchObject({
      role: 'capataz',
    })
    expect(next.people.find((p) => p.id === crew.foremanId)).toMatchObject({
      role: 'peon',
    })
    const outsider = base.people.find((p) => p.crewId === otherCrew.id && p.role === 'peon')
    if (!outsider) throw new Error('missing outsider')
    expect(() => setForeman(base, crew.id, outsider.id, context)).toThrow(CommandError)
  })

  it('creates, renames and dissolves a crew', () => {
    const candidate = base.people.find((p) => p.crewId === crew.id && p.id !== crew.foremanId)
    if (!candidate) throw new Error('missing candidate')
    const created = createCrew(base, { name: 'Cuadrilla Costa', foremanId: candidate.id }, context)
    expect(created.workspace.people.find((p) => p.id === candidate.id)).toMatchObject({
      role: 'capataz',
      crewId: created.crew.id,
    })
    expect(() =>
      createCrew(created.workspace, { name: 'cuadrilla costa', foremanId: worker.id }, context),
    ).toThrow(CommandError)
    expect(() => createCrew(base, { name: 'Otra', foremanId: crew.foremanId }, context)).toThrow(
      CommandError,
    )
    const renamed = renameCrew(created.workspace, created.crew.id, 'Costa Norte')
    expect(renamed.people.find((p) => p.id === candidate.id)?.title).toBe('Capataz · Costa Norte')
    const dissolved = dissolveCrew(renamed, created.crew.id)
    expect(dissolved.crews.some((c) => c.id === created.crew.id)).toBe(false)
    expect(dissolved.people.find((p) => p.id === candidate.id)).toMatchObject({
      crewId: null,
      role: 'peon',
    })
    expect(() => dissolveCrew(base, crew.id)).toThrow(CommandError)
  })

  it('cancels an absence and tells the person', () => {
    const absence = base.absences[0]
    if (!absence) throw new Error('seed needs an absence')
    const next = cancelAbsence(base, absence.id, context)
    expect(next.absences.some((item) => item.id === absence.id)).toBe(false)
    expect(next.notifications[0]).toMatchObject({
      kind: 'ausencia_resuelta',
      personId: absence.personId,
    })
    expect(() => cancelAbsence(base, 'nope', context)).toThrow(CommandError)
  })
})

describe('crew profitability', () => {
  const workspace = buildSeed(TODAY)

  it('splits the real cost of every work among the crews that reported it', () => {
    const rows = crewProfitability(workspace, null)
    const real = workspace.works.reduce(
      (sum, work) =>
        sum + calculatePerformance(work, workspace.reports, workspace.people).totalCost,
      0,
    )
    expect(rows.reduce((sum, row) => sum + row.cost, 0)).toBe(real)
    const prices = workspace.works.reduce((sum, work) => sum + work.planned.price, 0)
    expect(rows.reduce((sum, row) => sum + row.revenue, 0)).toBeLessThanOrEqual(
      prices + rows.length,
    )
    expect(rows.every((row) => row.margin === row.revenue - row.cost)).toBe(true)
  })

  it('ranks by margin rate, limits to a campaign and keeps crews without data', () => {
    const all = crewProfitability(workspace, null)
    const rates = all.filter((row) => row.revenue > 0).map((row) => row.marginRate)
    expect(rates).toEqual([...rates].sort((a, b) => b - a))
    expect(all).toHaveLength(workspace.crews.length)
    const none = crewProfitability(workspace, 1999)
    expect(none).toHaveLength(workspace.crews.length)
    expect(none.every((row) => row.revenue === 0 && row.cost === 0 && row.works === 0)).toBe(true)
  })
})

describe('CSV', () => {
  const workspace = buildSeed(TODAY)
  const PARAMS = {
    crewSize: 5,
    dailyCost: 16_000,
    travelPerCrewDay: 9_000,
    targetMargin: 0.2,
  }

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

describe('accounting', () => {
  const base = buildSeed(TODAY)
  const invoice = (id: string, date: string, status: 'borrador' | 'enviada', price: number) => ({
    id,
    reference: id,
    workId: 'w',
    clientId: 'c',
    kind: 'final' as const,
    date,
    progressTo: 1,
    lines: [{ description: 'x', quantity: 1, unit: 'ud', unitPrice: price }],
    vatRate: 0.21,
    status,
    sentOn: null,
    paidOn: null,
  })
  const expense = (id: string, date: string, status: 'pendiente' | 'aprobado', amount: number) => ({
    ...(base.expenses[0] as (typeof base.expenses)[number]),
    id,
    date,
    status,
    amount,
  })
  const workspace = {
    ...base,
    invoices: [
      invoice('a', '2025-02-10', 'enviada', 100_000),
      invoice('b', '2026-02-10', 'enviada', 150_000),
      invoice('c', '2026-05-03', 'enviada', 40_000),
      invoice('d', '2026-05-04', 'borrador', 999_000),
    ],
    expenses: [
      expense('e1', '2026-02-20', 'aprobado', 30_000),
      expense('e2', '2026-05-20', 'pendiente', 70_000),
    ],
  }

  it('assigns dates to quarters', () => {
    expect([quarterOf('2026-01-01'), quarterOf('2026-06-30'), quarterOf('2026-12-31')]).toEqual([
      1, 2, 4,
    ])
  })

  it('counts issued invoices without VAT and approved expenses only', () => {
    expect(periodTotals(workspace, 2026, 1)).toEqual({
      income: 150_000,
      expenses: 30_000,
      result: 120_000,
    })
    expect(periodTotals(workspace, 2026, 2)).toEqual({
      income: 40_000,
      expenses: 0,
      result: 40_000,
    })
    expect(accountingYears(workspace)).toEqual([2025, 2026])
  })

  it('compares the same quarter across years', () => {
    const points = quarterlyComparison(workspace, [2025, 2026], 'income')
    expect(points[0]).toMatchObject({
      quarter: 1,
      '2025': 100_000,
      '2026': 150_000,
    })
    expect(monthlyAccounts(workspace, 2026)[1]).toMatchObject({
      income: 150_000,
      expenses: 30_000,
    })
  })
})
