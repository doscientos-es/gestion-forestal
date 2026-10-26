import { describe, expect, it } from 'vitest'

import { buildSeed } from '../infrastructure/build-seed'
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
  submitReport,
  type Context,
} from './commands'
import { invoiceTotals } from './invoice-draft'
import { findConflicts, suggestedEnd } from './planning'
import { calculatePerformance } from './work-performance'
import { availableYears, summarizeYear } from './year-comparison'

const TODAY = '2026-11-04'
let sequence = 0
const context: Context = { id: () => `id-${(sequence += 1)}`, today: TODAY }

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
