import type { IsoDate } from '@/shared/lib/dates'

import type { Attachment, DailyReport, Incident, Work, Workspace } from './model'
import { calculatePerformance, reportsForWork } from './work-performance'

export type ReportPhoto = { photo: Attachment; date: IsoDate; reportId: string }

export type ClientWorkReport = {
  /** Physical progress 0–1, capped at 1: the client never sees «110 %». */
  progress: number
  plants: number
  plannedPlants: number
  hectares: number
  plannedHectares: number
  crewDays: number
  from: IsoDate | null
  to: IsoDate | null
  /** Oldest first, as a diary. */
  days: DailyReport[]
  /** Days lost to rain or other incidents, by kind. */
  incidents: Partial<Record<Exclude<Incident, 'ninguna'>, number>>
  /** Newest first. */
  photos: ReportPhoto[]
}

/**
 * What the client may see of a work: progress, a daily diary and photos. Costs, margin, yields and
 * who worked each day stay inside the company.
 */
export function clientWorkReport(work: Work, workspace: Workspace): ClientWorkReport {
  const performance = calculatePerformance(work, workspace.reports, workspace.people)
  const days = [...reportsForWork(work.id, workspace.reports)].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  const incidents: ClientWorkReport['incidents'] = {}
  for (const day of days) {
    if (day.incident !== 'ninguna') incidents[day.incident] = (incidents[day.incident] ?? 0) + 1
  }
  return {
    progress: Math.min(performance.progress, 1),
    plants: performance.plants,
    plannedPlants: work.planned.plants,
    hectares: Math.round(performance.hectares * 100) / 100,
    plannedHectares: work.planned.hectares,
    crewDays: performance.crewDays,
    from: days[0]?.date ?? null,
    to: days.at(-1)?.date ?? null,
    days,
    incidents,
    photos: days
      .flatMap((day) => day.photos.map((photo) => ({ photo, date: day.date, reportId: day.id })))
      .reverse(),
  }
}
