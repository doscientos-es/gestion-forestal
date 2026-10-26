import type { IsoDate } from '@/shared/lib/dates'

import type { Cents, DailyReport, Person, Work } from './model'

export type WorkPerformance = {
  reportCount: number
  plants: number
  hectares: number
  workerDays: number
  crewDays: number
  laborCost: Cents
  materialCost: Cents
  travelCost: Cents
  totalCost: Cents
  /** Physical progress, 0–1 (can exceed 1 when more is planted than budgeted). */
  progress: number
  plannedYield: number
  actualYield: number
  /** actual ÷ planned − 1. Positive = faster than budgeted. */
  yieldDeviation: number
  /** Expected cost at completion, extrapolating labour from the actual yield. */
  projectedCost: Cents
  projectedMargin: Cents
  projectedMarginRate: number
  plannedMargin: Cents
  plannedMarginRate: number
  lastReportOn: IsoDate | null
}

function dailyCostOf(personId: string, people: Person[], fallback: Cents) {
  return people.find((person) => person.id === personId)?.dailyCost ?? fallback
}

export function reportsForWork(workId: string, reports: DailyReport[]) {
  return reports.filter((report) => report.workId === workId)
}

export function calculatePerformance(
  work: Work,
  reports: DailyReport[],
  people: Person[],
): WorkPerformance {
  const own = reportsForWork(work.id, reports)
  const { planned } = work
  const plants = own.reduce((sum, report) => sum + report.plants, 0)
  const hectares = own.reduce((sum, report) => sum + report.hectares, 0)
  const workerDays = own.reduce((sum, report) => sum + report.workerIds.length, 0)
  const crewDays = new Set(own.map((report) => `${report.crewId}:${report.date}`)).size
  const laborCost = own.reduce(
    (sum, report) =>
      sum +
      report.workerIds.reduce((acc, id) => acc + dailyCostOf(id, people, planned.dailyCost), 0),
    0,
  )
  const materialCost = plants * planned.unitMaterialCost
  const travelCost = crewDays * planned.travelPerCrewDay
  const totalCost = laborCost + materialCost + travelCost

  const progress =
    planned.plants > 0
      ? plants / planned.plants
      : planned.hectares > 0
        ? hectares / planned.hectares
        : 0
  const plannedYield = planned.workerDays > 0 ? planned.plants / planned.workerDays : 0
  const actualYield = workerDays > 0 ? plants / workerDays : 0
  const yieldDeviation = plannedYield > 0 && workerDays > 0 ? actualYield / plannedYield - 1 : 0

  const finished = work.status === 'terminada' || work.status === 'facturada'
  let projectedCost = planned.totalCost
  if (finished) projectedCost = totalCost
  else if (progress > 0) {
    const remaining = Math.max(0, 1 - progress)
    projectedCost =
      totalCost +
      Math.round(((laborCost + travelCost) / progress) * remaining) +
      Math.round(planned.materialCost * remaining)
  }

  const plannedMargin = planned.price - planned.totalCost
  const projectedMargin = planned.price - projectedCost
  const lastReportOn = own.reduce<IsoDate | null>(
    (latest, report) => (!latest || report.date > latest ? report.date : latest),
    null,
  )

  return {
    reportCount: own.length,
    plants,
    hectares,
    workerDays,
    crewDays,
    laborCost,
    materialCost,
    travelCost,
    totalCost,
    progress,
    plannedYield,
    actualYield,
    yieldDeviation,
    projectedCost,
    projectedMargin,
    projectedMarginRate: planned.price > 0 ? projectedMargin / planned.price : 0,
    plannedMargin,
    plannedMarginRate: planned.price > 0 ? plannedMargin / planned.price : 0,
    lastReportOn,
  }
}

export type ProgressPoint = { date: IsoDate; planned: number; actual: number }

/** Cumulative plants per report day against a linear plan over the budgeted crew days. */
export function cumulativeProgress(work: Work, reports: DailyReport[]): ProgressPoint[] {
  const own = [...reportsForWork(work.id, reports)].sort((a, b) => a.date.localeCompare(b.date))
  const byDate = new Map<IsoDate, number>()
  for (const report of own) byDate.set(report.date, (byDate.get(report.date) ?? 0) + report.plants)
  const perDay = work.planned.crewDays > 0 ? work.planned.plants / work.planned.crewDays : 0
  let actual = 0
  return [...byDate.entries()].map(([date, plants], index) => {
    actual += plants
    return {
      date,
      actual,
      planned: Math.min(work.planned.plants, Math.round(perDay * (index + 1))),
    }
  })
}
