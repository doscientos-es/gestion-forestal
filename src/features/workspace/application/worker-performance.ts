import type { DailyReport, Person, Work, Workspace } from './model'
import { workerRating, workerRatingSummary, type WorkerRatingSummary } from './worker-rating'

export type WorkerWorkPerformance = WorkerRatingSummary & {
  work: Work
  reportCount: number
  workedDays: number
  laborCost: number
  incidentDays: number
  lastReportOn: string | null
  unit: 'pl/peonada' | 'ha/peonada'
  /** Yield of the entire team, on the reports where this person participated. */
  teamYield: number | null
  plannedYield: number
  teamYieldDeviation: number | null
}

export type WorkerPerformance = WorkerRatingSummary & {
  person: Person
  ratingHistory: { report: DailyReport; score: number }[]
  works: WorkerWorkPerformance[]
  reportCount: number
  workedDays: number
  laborCost: number
  incidentDays: number
  /** Multiple full-day reports on one date need review, not a productivity reward. */
  overlappingDays: number
  lastReportOn: string | null
  teamYieldDeviation: number | null
}

function workSummary(work: Work, reports: DailyReport[], person: Person): WorkerWorkPerformance {
  const planting = work.planned.plants > 0
  const units = reports.reduce(
    (sum, report) => sum + (planting ? report.plants : report.hectares),
    0,
  )
  const teamDays = reports.reduce((sum, report) => sum + new Set(report.workerIds).size, 0)
  const plannedYield =
    work.planned.workerDays > 0
      ? (planting ? work.planned.plants : work.planned.hectares) / work.planned.workerDays
      : 0
  const teamYield = teamDays > 0 ? units / teamDays : null
  return {
    ...workerRatingSummary(reports, person.id),
    work,
    reportCount: reports.length,
    workedDays: new Set(reports.map((report) => report.date)).size,
    laborCost: reports.length * person.dailyCost,
    incidentDays: new Set(
      reports.filter((report) => report.incident !== 'ninguna').map((report) => report.date),
    ).size,
    lastReportOn:
      reports
        .map((report) => report.date)
        .sort()
        .at(-1) ?? null,
    unit: planting ? 'pl/peonada' : 'ha/peonada',
    teamYield,
    plannedYield,
    teamYieldDeviation:
      teamYield !== null && plannedYield > 0 ? teamYield / plannedYield - 1 : null,
  }
}

/** Attendance comes from reports, not current crew membership; production is NEVER individual. */
export function workerPerformance(workspace: Workspace, year: number | null): WorkerPerformance[] {
  const works = workspace.works.filter((work) => year === null || work.year === year)
  const workIds = new Set(works.map((work) => work.id))
  const reports = workspace.reports.filter((report) => workIds.has(report.workId))
  return workspace.people
    .filter((person) => person.role !== 'admin')
    .map((person) => {
      const own = reports.filter((report) => report.workerIds.includes(person.id))
      const summaries = works
        .map((work) =>
          workSummary(
            work,
            own.filter((report) => report.workId === work.id),
            person,
          ),
        )
        .filter((item) => item.reportCount > 0)
        .sort((a, b) => (b.lastReportOn ?? '').localeCompare(a.lastReportOn ?? ''))
      const comparable = summaries.filter((item) => item.teamYieldDeviation !== null)
      const weight = comparable.reduce((sum, item) => sum + item.reportCount, 0)
      const byDate = new Map<string, number>()
      for (const report of own) byDate.set(report.date, (byDate.get(report.date) ?? 0) + 1)
      return {
        ...workerRatingSummary(own, person.id),
        person,
        ratingHistory: own
          .flatMap((report) => {
            const score = workerRating(report, person.id)
            return score === null ? [] : [{ report, score }]
          })
          .sort((a, b) => b.report.date.localeCompare(a.report.date)),
        works: summaries,
        reportCount: own.length,
        workedDays: byDate.size,
        laborCost: own.length * person.dailyCost,
        incidentDays: new Set(
          own.filter((report) => report.incident !== 'ninguna').map((report) => report.date),
        ).size,
        overlappingDays: [...byDate.values()].filter((count) => count > 1).length,
        lastReportOn: summaries[0]?.lastReportOn ?? null,
        teamYieldDeviation:
          weight > 0
            ? comparable.reduce(
                (sum, item) => sum + (item.teamYieldDeviation ?? 0) * item.reportCount,
                0,
              ) / weight
            : null,
      }
    })
    .sort((a, b) => a.person.name.localeCompare(b.person.name, 'es'))
}
