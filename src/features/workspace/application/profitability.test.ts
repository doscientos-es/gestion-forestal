import { describe, expect, it } from 'vitest'

import { buildSeed } from '../infrastructure/build-seed'
import type { DailyReport, Work, Workspace } from './model'
import { clientWorkComparison, workProfitability } from './work-profitability'
import { workerPerformance } from './worker-performance'

const seed = buildSeed('2026-11-03')
const original = seed.works[0]
const expenseTemplate = seed.expenses[0]
const invoiceTemplate = seed.invoices[0]
if (!original || !expenseTemplate || !invoiceTemplate) throw new Error('Missing test fixtures')
const work: Work = {
  ...original,
  id: 'work',
  budgetId: 'budget',
  clientId: 'client',
  zoneId: 'zone',
  year: 2026,
  status: 'en_curso',
  finishedOn: null,
  planned: {
    plants: 1000,
    hectares: 10,
    workerDays: 10,
    crewDays: 5,
    crewSize: 2,
    laborCost: 100_000,
    materialCost: 10_000,
    travelCost: 5000,
    totalCost: 115_000,
    price: 150_000,
    dailyCost: 10_000,
    travelPerCrewDay: 1000,
    unitMaterialCost: 10,
  },
}
const people = seed.people
  .filter((person) => person.role !== 'admin')
  .slice(0, 2)
  .map((person, index) => ({
    ...person,
    id: index === 0 ? 'a' : 'b',
    dailyCost: (index + 1) * 10_000,
  }))

function report(input: Partial<DailyReport> = {}): DailyReport {
  return {
    id: 'report',
    workId: work.id,
    crewId: 'crew',
    date: '2026-10-01',
    workerIds: ['a', 'b'],
    plants: 200,
    hectares: 2,
    incident: 'ninguna',
    notes: '',
    authorId: 'a',
    photos: [],
    ...input,
  }
}

function workspace(input: Partial<Workspace> = {}): Workspace {
  return {
    ...seed,
    works: [work],
    people,
    reports: [report()],
    budgets: [],
    expenses: [],
    invoices: [],
    ...input,
  }
}

describe('operational work profitability', () => {
  it('compares incurred cost with the same physical progress and projects remaining effort', () => {
    const result = workProfitability(workspace(), work)
    expect(result.performance.totalCost).toBe(33_000)
    expect(result.budgetAtProgress).toBe(23_000)
    expect(result.costDeviation).toBe(10_000)
    expect(result.earnedValue).toBe(30_000)
    expect(result.projectedCost).toBe(165_000)
    expect(result.projectedMargin).toBe(-15_000)
    expect(result.projectedMarginRate).toBe(-0.1)
    expect(result.projectedWorkerDays).toBe(10)
    expect(result.remainingWorkerDays).toBe(8)
    expect(result.costPerHectare).toBe(16_500)
    expect(result.workerDaysPerHectare).toBe(1)
  })

  it('does not present missing reports as a zero-cost profitable job, even after closure', () => {
    for (const status of ['en_curso', 'terminada', 'facturada'] as const) {
      const current = { ...work, status }
      const result = workProfitability(workspace({ reports: [], works: [current] }), current)
      expect(result.hasData).toBe(false)
      expect(result.projectedCost).toBeNull()
      expect(result.projectedMargin).toBeNull()
      expect(result.projectedWorkerDays).toBeNull()
      expect(result.costPerHectare).toBeNull()
      expect(result.costDeviation).toBeNull()
    }
  })

  it('keeps costs from zero-output days but does not invent a completion forecast', () => {
    const result = workProfitability(
      workspace({ reports: [report({ plants: 0, hectares: 0, incident: 'lluvia' })] }),
      work,
    )
    expect(result.performance.totalCost).toBe(31_000)
    expect(result.costDeviation).toBe(31_000)
    expect(result.projectedCost).toBeNull()
    expect(result.remainingWorkerDays).toBeNull()
    expect(result.costPerHectare).toBeNull()
  })

  it('uses recorded effort at closure, not extrapolated effort', () => {
    const closed: Work = { ...work, status: 'terminada' }
    const result = workProfitability(workspace({ works: [closed] }), closed)
    expect(result.projectedCost).toBe(33_000)
    expect(result.projectedWorkerDays).toBe(2)
    expect(result.remainingWorkerDays).toBe(0)
  })

  it.each(['en_curso', 'terminada'] as const)(
    'retains free-form budget costs in %s forecasts without inventing incurred costs',
    (status) => {
      const current: Work = {
        ...work,
        status,
        planned: { ...work.planned, otherCost: 12_345, totalCost: work.planned.totalCost + 12_345 },
      }
      const result = workProfitability(workspace({ works: [current] }), current)
      const baseline = workProfitability(workspace(), { ...work, status })
      if (baseline.projectedCost === null || baseline.projectedMargin === null)
        throw new Error('Missing fixture forecast')
      expect(result.performance.totalCost).toBe(baseline.performance.totalCost)
      expect(result.budgetAtProgress).toBe(baseline.budgetAtProgress)
      expect(result.costDeviation).toBe(baseline.costDeviation)
      expect(result.projectedCost).toBe(baseline.projectedCost + 12_345)
      expect(result.projectedMargin).toBe(baseline.projectedMargin - 12_345)
    },
  )

  it('distinguishes calendar activity from simultaneous crew days and caps earned value', () => {
    const result = workProfitability(
      workspace({
        reports: [report({ plants: 800 }), report({ id: 'second', crewId: 'other', plants: 800 })],
      }),
      work,
    )
    expect(result.reportDays).toBe(1)
    expect(result.performance.crewDays).toBe(2)
    expect(result.earnedValue).toBe(work.planned.price)
    expect(result.remainingWorkerDays).toBe(0)
    expect(result.projectedCost).toBe(result.performance.totalCost)
  })

  it('keeps gross receipts separate from calculated costs to prevent double counting', () => {
    const expenses = [
      {
        ...expenseTemplate,
        id: 'approved',
        workId: work.id,
        status: 'aprobado' as const,
        amount: 12_100,
      },
      {
        ...expenseTemplate,
        id: 'pending',
        workId: work.id,
        status: 'pendiente' as const,
        amount: 5000,
      },
      {
        ...expenseTemplate,
        id: 'rejected',
        workId: work.id,
        status: 'rechazado' as const,
        amount: 9000,
      },
      {
        ...expenseTemplate,
        id: 'general',
        workId: null,
        status: 'aprobado' as const,
        amount: 4000,
      },
    ]
    const result = workProfitability(workspace({ expenses }), work)
    expect(result.approvedExpenses).toBe(12_100)
    expect(result.pendingExpenses).toBe(5000)
    expect(result.performance.totalCost).toBe(33_000)
  })

  it('excludes drafts and other works from billed and collected amounts, without VAT', () => {
    const invoice = (id: string, status: 'borrador' | 'enviada' | 'cobrada', amount: number) => ({
      ...invoiceTemplate,
      id,
      workId: work.id,
      status,
      vatRate: 0.21,
      lines: [{ description: 'Trabajo', quantity: 1, unit: 'ud', unitPrice: amount }],
    })
    const result = workProfitability(
      workspace({
        invoices: [
          invoice('draft', 'borrador', 10_000),
          invoice('issued', 'enviada', 20_000),
          invoice('paid', 'cobrada', 30_000),
          { ...invoice('other', 'cobrada', 40_000), workId: 'other' },
        ],
      }),
      work,
    )
    expect(result.invoiced).toBe(50_000)
    expect(result.collected).toBe(30_000)
  })
})

describe('client work history', () => {
  const previous: Work = {
    ...work,
    id: 'old',
    year: 2025,
    status: 'terminada',
    finishedOn: '2025-10-02',
  }
  const second: Work = { ...previous, id: 'old-2', zoneId: 'other-zone', finishedOn: '2025-10-03' }
  const firstReport = report({
    workId: previous.id,
    date: '2025-10-01',
    workerIds: ['a'],
    plants: 1000,
    hectares: 10,
  })
  const secondReport = report({ id: 'old-report-2', workId: second.id, date: '2025-10-02' })
  const history = () =>
    workspace({ works: [work, previous, second], reports: [report(), firstReport, secondReport] })

  it('weights cost and effort by executed hectares and margin by contracted value', () => {
    const result = clientWorkComparison(history(), work)
    expect(result.history).toHaveLength(2)
    expect(result.historicalCostPerHectare).toBe(4500)
    expect(result.historicalWorkerDaysPerHectare).toBe(0.25)
    expect(result.historicalMarginRate).toBeCloseTo(0.82)
    expect(result.costPerHectareChange).toBeCloseTo(16_500 / 4500 - 1)
    expect(result.marginRateChange).toBeCloseTo(-0.92)
  })

  it('narrows history to the same zone when requested', () => {
    const result = clientWorkComparison(history(), work, true)
    expect(result.history.map((item) => item.work.id)).toEqual(['old'])
    expect(result.historicalCostPerHectare).toBe(2100)
  })

  it('excludes other clients, open or future works, incompatible tasks and missing reports', () => {
    const invalid: Work[] = [
      { ...previous, id: 'client', clientId: 'another' },
      { ...previous, id: 'open', status: 'en_curso' },
      { ...previous, id: 'future', finishedOn: '2026-10-02' },
      { ...previous, id: 'treatment', planned: { ...work.planned, plants: 0 } },
      { ...previous, id: 'no-reports' },
    ]
    const state = workspace({
      works: [work, ...invalid],
      reports: [
        report(),
        ...invalid
          .filter((item) => item.id !== 'no-reports')
          .map((item) => report({ id: item.id, workId: item.id, date: '2025-10-01' })),
      ],
    })
    const result = clientWorkComparison(state, work)
    expect(result.history).toEqual([])
    expect(result.historicalCostPerHectare).toBeNull()
    expect(result.marginRateChange).toBeNull()
  })
})

describe('worker participation and contextual team yield', () => {
  it('uses historical participation, not current crew membership, without inventing individual output', () => {
    const state = workspace({ people: people.map((person) => ({ ...person, crewId: 'new-crew' })) })
    const rows = workerPerformance(state, 2026)
    const a = rows.find((row) => row.person.id === 'a')
    const b = rows.find((row) => row.person.id === 'b')
    expect(a).toMatchObject({
      reportCount: 1,
      workedDays: 1,
      laborCost: 10_000,
      teamYieldDeviation: 0,
    })
    expect(b).toMatchObject({ reportCount: 1, laborCost: 20_000, teamYieldDeviation: 0 })
    expect(a?.works[0]).toMatchObject({ teamYield: 100, plannedYield: 100 })
    expect(a).not.toHaveProperty('plants')
    expect(a).not.toHaveProperty('individualYield')
  })

  it('keeps workers with no records but marks their productivity as unknown', () => {
    const rows = workerPerformance(workspace({ reports: [] }), null)
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.teamYieldDeviation === null && row.reportCount === 0)).toBe(true)
  })

  it('filters campaigns and retains zero-output incidents rather than hiding slow days', () => {
    const previous: Work = { ...work, id: 'old', year: 2025 }
    const state = workspace({
      works: [work, previous],
      reports: [
        report({ plants: 0, incident: 'lluvia' }),
        report({ id: 'old', workId: previous.id, date: '2025-10-01', plants: 400 }),
      ],
    })
    expect(workerPerformance(state, 2026).find((row) => row.person.id === 'a')).toMatchObject({
      reportCount: 1,
      incidentDays: 1,
      teamYieldDeviation: -1,
    })
    expect(workerPerformance(state, 2025).find((row) => row.person.id === 'a')).toMatchObject({
      reportCount: 1,
      incidentDays: 0,
      teamYieldDeviation: 1,
    })
  })

  it('flags multiple full-day reports without counting them as distinct worked dates', () => {
    const rows = workerPerformance(
      workspace({ reports: [report(), report({ id: 'second', crewId: 'other' })] }),
      null,
    )
    expect(rows.find((row) => row.person.id === 'a')).toMatchObject({
      reportCount: 2,
      workedDays: 1,
      overlappingDays: 1,
      laborCost: 20_000,
    })
  })

  it('uses hectares per worker-day for treatment jobs and never mixes units in averages', () => {
    const treatment: Work = { ...work, id: 'treatment', planned: { ...work.planned, plants: 0 } }
    const state = workspace({
      works: [work, treatment],
      reports: [
        report(),
        report({
          id: 'treatment',
          workId: treatment.id,
          date: '2026-10-02',
          plants: 0,
          hectares: 2,
        }),
      ],
    })
    const a = workerPerformance(state, 2026).find((row) => row.person.id === 'a')
    expect(a?.works.find((item) => item.work.id === treatment.id)).toMatchObject({
      unit: 'ha/peonada',
      teamYield: 1,
      plannedYield: 1,
      teamYieldDeviation: 0,
    })
    expect(a?.teamYieldDeviation).toBe(0)
  })
})
