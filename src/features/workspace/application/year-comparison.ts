import { monthOf, yearOf } from '@/shared/lib/dates'

import type { Cents, Workspace } from './model'
import { calculatePerformance } from './work-performance'

export type YearSummary = {
  year: number
  works: number
  finished: number
  hectares: number
  plants: number
  revenue: Cents
  cost: Cents
  margin: Cents
  marginRate: number
  /** Plants per worker day, from daily reports. */
  actualYield: number
  plannedYield: number
}

export type GroupRow = {
  key: string
  label: string
  values: Record<number, { revenue: Cents; margin: Cents; hectares: number }>
}

function emptySummary(year: number): YearSummary {
  return {
    year,
    works: 0,
    finished: 0,
    hectares: 0,
    plants: 0,
    revenue: 0,
    cost: 0,
    margin: 0,
    marginRate: 0,
    actualYield: 0,
    plannedYield: 0,
  }
}

export function availableYears(workspace: Workspace) {
  return [...new Set(workspace.works.map((work) => work.year))].sort((a, b) => a - b)
}

/** Revenue = budgeted price; cost = actual if finished, projected otherwise. */
export function summarizeYear(workspace: Workspace, year: number): YearSummary {
  const summary = emptySummary(year)
  let plannedPlants = 0
  let plannedDays = 0
  let actualPlants = 0
  let actualDays = 0
  for (const work of workspace.works.filter((item) => item.year === year)) {
    const performance = calculatePerformance(work, workspace.reports, workspace.people)
    summary.works += 1
    if (work.status === 'terminada' || work.status === 'facturada') summary.finished += 1
    summary.hectares += work.planned.hectares
    summary.plants += work.planned.plants
    summary.revenue += work.planned.price
    summary.cost += performance.projectedCost
    plannedPlants += work.planned.plants
    plannedDays += work.planned.workerDays
    actualPlants += performance.plants
    actualDays += performance.workerDays
  }
  summary.margin = summary.revenue - summary.cost
  summary.marginRate = summary.revenue > 0 ? summary.margin / summary.revenue : 0
  summary.plannedYield = plannedDays > 0 ? plannedPlants / plannedDays : 0
  summary.actualYield = actualDays > 0 ? actualPlants / actualDays : 0
  return summary
}

export type MonthlyPoint = { month: number } & Record<string, number>

/** Plants reported per month, one series per year (key = year as string). */
export function monthlyPlants(workspace: Workspace, years: number[]): MonthlyPoint[] {
  const points: MonthlyPoint[] = Array.from({ length: 12 }, (_, index) => {
    const point: MonthlyPoint = { month: index + 1 }
    for (const year of years) point[String(year)] = 0
    return point
  })
  for (const report of workspace.reports) {
    const year = yearOf(report.date)
    if (!years.includes(year)) continue
    const point = points[monthOf(report.date) - 1]
    if (point) point[String(year)] = (point[String(year)] ?? 0) + report.plants
  }
  return points
}

export function groupBy(
  workspace: Workspace,
  years: number[],
  dimension: 'zona' | 'cliente',
): GroupRow[] {
  const rows = new Map<string, GroupRow>()
  for (const work of workspace.works) {
    if (!years.includes(work.year)) continue
    const key = dimension === 'zona' ? work.zoneId : work.clientId
    const label =
      dimension === 'zona'
        ? (workspace.zones.find((zone) => zone.id === key)?.name ?? key)
        : (workspace.clients.find((client) => client.id === key)?.name ?? key)
    const row = rows.get(key) ?? { key, label, values: {} }
    const value = row.values[work.year] ?? { revenue: 0, margin: 0, hectares: 0 }
    const performance = calculatePerformance(work, workspace.reports, workspace.people)
    value.revenue += work.planned.price
    value.margin += work.planned.price - performance.projectedCost
    value.hectares += work.planned.hectares
    row.values[work.year] = value
    rows.set(key, row)
  }
  return [...rows.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

export function relativeChange(current: number, previous: number) {
  return previous !== 0 ? current / previous - 1 : 0
}
