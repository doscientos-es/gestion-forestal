import type { DailyReport } from './model'

export const WORKER_RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

export function isWorkerRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10
}

/** Historical missing/invalid scores are unknown, never zero or an invented default. */
export function workerRating(report: DailyReport, personId: string): number | null {
  const score = report.workerRatings?.[personId]
  return report.workerIds.includes(personId) && isWorkerRating(score) ? score : null
}

export type WorkerRatingSummary = { ratedReports: number; averageRating: number | null }

export function workerRatingSummary(reports: DailyReport[], personId: string): WorkerRatingSummary {
  const ratings = reports
    .map((report) => workerRating(report, personId))
    .filter((score): score is number => score !== null)
  return {
    ratedReports: ratings.length,
    averageRating:
      ratings.length > 0 ? ratings.reduce((sum, score) => sum + score, 0) / ratings.length : null,
  }
}
