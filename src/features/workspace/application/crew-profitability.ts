import type { Cents, Crew, DailyReport, Work, Workspace } from './model'

export type CrewProfit = {
  crew: Crew
  works: number
  workerDays: number
  plants: number
  hectares: number
  /** Plants per worker day; 0 without worker days. */
  yield: number
  /** What the budgets of the same works expected from the same worker days. */
  plannedYield: number
  /** yield ÷ plannedYield − 1. */
  yieldDeviation: number
  /** Price of each work shared out by what this crew planted (earned value, not the full price). */
  revenue: Cents
  cost: Cents
  margin: Cents
  marginRate: number
}

type Acc = Omit<CrewProfit, 'crew' | 'yield' | 'yieldDeviation' | 'margin' | 'marginRate'> & {
  plannedPlantsEquivalent: number
}

const empty = (): Acc => ({
  works: 0,
  workerDays: 0,
  plants: 0,
  hectares: 0,
  plannedYield: 0,
  plannedPlantsEquivalent: 0,
  revenue: 0,
  cost: 0,
})

function groupByCrew(reports: DailyReport[]) {
  const groups = new Map<string, DailyReport[]>()
  for (const report of reports)
    groups.set(report.crewId, [...(groups.get(report.crewId) ?? []), report])
  return groups
}

/**
 * Profitability per crew from the daily reports. Each work's price is shared among the crews by
 * what each one planted (hectares for works without plants), so the result is the value a crew
 * has produced so far, and costs are the real ones: wages of whoever worked, travel and plants.
 * `year` limits it to one campaign; `null` takes every work.
 */
export function crewProfitability(workspace: Workspace, year: number | null): CrewProfit[] {
  const totals = new Map<string, Acc>()
  for (const work of workspace.works as Work[]) {
    if (year !== null && work.year !== year) continue
    const reports = workspace.reports.filter((report) => report.workId === work.id)
    const { planned } = work
    const byPlants = planned.plants > 0
    const units = (report: DailyReport) => (byPlants ? report.plants : report.hectares)
    const done = reports.reduce((sum, report) => sum + units(report), 0)
    const denominator = Math.max(byPlants ? planned.plants : planned.hectares, done)
    const plannedPerDay = planned.workerDays > 0 ? planned.plants / planned.workerDays : 0
    for (const [crewId, own] of groupByCrew(reports)) {
      const acc = totals.get(crewId) ?? empty()
      const workerDays = own.reduce((sum, report) => sum + report.workerIds.length, 0)
      const crewDays = new Set(own.map((report) => report.date)).size
      const plants = own.reduce((sum, report) => sum + report.plants, 0)
      const labor = own.reduce(
        (sum, report) =>
          sum +
          report.workerIds.reduce(
            (inner, id) =>
              inner + (workspace.people.find((p) => p.id === id)?.dailyCost ?? planned.dailyCost),
            0,
          ),
        0,
      )
      acc.works += 1
      acc.workerDays += workerDays
      acc.plants += plants
      acc.hectares += own.reduce((sum, report) => sum + report.hectares, 0)
      acc.plannedPlantsEquivalent += workerDays * plannedPerDay
      acc.revenue +=
        denominator > 0
          ? Math.round(planned.price * (own.reduce((s, r) => s + units(r), 0) / denominator))
          : 0
      acc.cost += labor + crewDays * planned.travelPerCrewDay + plants * planned.unitMaterialCost
      totals.set(crewId, acc)
    }
  }
  return workspace.crews
    .map((crew) => {
      const acc = totals.get(crew.id) ?? empty()
      const yieldValue = acc.workerDays > 0 ? acc.plants / acc.workerDays : 0
      const plannedYield = acc.workerDays > 0 ? acc.plannedPlantsEquivalent / acc.workerDays : 0
      const margin = acc.revenue - acc.cost
      return {
        crew,
        works: acc.works,
        workerDays: acc.workerDays,
        plants: acc.plants,
        hectares: acc.hectares,
        yield: yieldValue,
        plannedYield,
        yieldDeviation: plannedYield > 0 && yieldValue > 0 ? yieldValue / plannedYield - 1 : 0,
        revenue: acc.revenue,
        cost: acc.cost,
        margin,
        marginRate: acc.revenue > 0 ? margin / acc.revenue : 0,
      }
    })
    .sort((a, b) => (b.revenue > 0 ? b.marginRate : -1) - (a.revenue > 0 ? a.marginRate : -1))
}
