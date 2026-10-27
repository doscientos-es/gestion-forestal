import type { Workspace } from './model'
import { calculatePerformance } from './work-performance'

export type YieldSuggestion = {
  /** Plants per worker and day, rounded to 5 so it reads like a budget figure. */
  value: number
  source: 'real' | 'tipico'
  /** Finished works the figure comes from; 0 for the typical value. */
  works: number
}

/** What to start a planting line with: the company's real yield if there is history, else the typical one. */
export function suggestedYield(
  workspace: Workspace,
  speciesId: string,
  typical: number,
): YieldSuggestion {
  const history = historicYield(workspace, speciesId)
  if (!history) return { value: typical, source: 'tipico', works: 0 }
  return {
    value: Math.max(5, Math.round(history.yield / 5) * 5),
    source: 'real',
    works: history.works,
  }
}

export type YieldHistory = { yield: number; budgeted: number; works: number }

/**
 * Real plants per worker day for a species, from finished single-species works
 * without treatment lines (treatments would distort the per-plant yield).
 */
export function historicYield(workspace: Workspace, speciesId: string): YieldHistory | null {
  let plants = 0
  let days = 0
  let budgetedPlants = 0
  let budgetedDays = 0
  let works = 0
  for (const work of workspace.works) {
    if (work.status !== 'terminada' && work.status !== 'facturada') continue
    if (work.speciesIds.length !== 1 || work.speciesIds[0] !== speciesId) continue
    const budget = workspace.budgets.find((item) => item.id === work.budgetId)
    if (!budget || budget.lines.some((line) => line.kind !== 'plantacion')) continue
    const performance = calculatePerformance(work, workspace.reports, workspace.people)
    if (performance.workerDays === 0) continue
    plants += performance.plants
    days += performance.workerDays
    budgetedPlants += budget.lines.reduce(
      (sum, line) => sum + (line.kind === 'plantacion' ? line.hectares * line.density : 0),
      0,
    )
    budgetedDays += budget.lines.reduce(
      (sum, line) =>
        sum + (line.kind === 'plantacion' ? (line.hectares * line.density) / line.yieldPerDay : 0),
      0,
    )
    works += 1
  }
  if (works === 0 || days === 0) return null
  return {
    yield: plants / days,
    budgeted: budgetedDays > 0 ? budgetedPlants / budgetedDays : 0,
    works,
  }
}
