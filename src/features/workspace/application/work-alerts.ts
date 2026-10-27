import type { Cents, Work, Workspace } from './model'
import { calculatePerformance } from './work-performance'

export type AlertSeverity = 'warning' | 'danger'

export type MarginAlert = {
  work: Work
  severity: AlertSeverity
  plannedRate: number
  projectedRate: number
  /** Margin the work is expected to lose against the budget, at the current pace. */
  lostMargin: Cents
  yieldDeviation: number
}

/** Days of crew work needed before the pace says anything; one rainy day is not a trend. */
const MIN_WORKER_DAYS = 5
/** Margin points lost before warning (3 % of the price). */
const WARN_DROP = 0.03
const MIN_SAFE_MARGIN = 0.05

/** Works in progress whose projected margin falls clearly below the budgeted one. */
export function marginAlerts(workspace: Workspace): MarginAlert[] {
  return workspace.works
    .filter((work) => work.status === 'en_curso')
    .flatMap((work) => {
      const performance = calculatePerformance(work, workspace.reports, workspace.people)
      if (performance.workerDays < MIN_WORKER_DAYS) return []
      const drop = performance.plannedMarginRate - performance.projectedMarginRate
      if (drop < WARN_DROP) return []
      const severity: AlertSeverity =
        performance.projectedMarginRate < MIN_SAFE_MARGIN ? 'danger' : 'warning'
      return [
        {
          work,
          severity,
          plannedRate: performance.plannedMarginRate,
          projectedRate: performance.projectedMarginRate,
          lostMargin: performance.plannedMargin - performance.projectedMargin,
          yieldDeviation: performance.yieldDeviation,
        },
      ]
    })
    .sort((a, b) => b.lostMargin - a.lostMargin)
}
