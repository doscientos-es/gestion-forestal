import {
  assignmentOn,
  availableMembers,
  crewMembers,
  type DailyReport,
  type Incident,
  type Person,
  type Work,
  type Workspace,
} from '@/features/workspace'
import type { IsoDate } from '@/shared/lib/dates'

export type ReportForm = {
  workerIds: string[]
  plants: number
  hectares: number
  incident: Incident
  notes: string
}

export type ReportContext = {
  work: Work
  crewId: string
  date: IsoDate
  members: Person[]
  existing: DailyReport | null
  /** Plants the crew should plant today at the budgeted yield. */
  target: number
}

/** Today's work for the foreman's crew, or null if the crew has nothing assigned. */
export function reportContext(
  workspace: Workspace,
  foreman: Person,
  date: IsoDate,
): ReportContext | null {
  if (!foreman.crewId) return null
  const assignment = assignmentOn(foreman.crewId, date, workspace.assignments)
  const work = workspace.works.find((item) => item.id === assignment?.workId)
  if (!assignment || !work) return null
  const existing =
    workspace.reports.find(
      (report) =>
        report.workId === work.id && report.crewId === foreman.crewId && report.date === date,
    ) ?? null
  const available = availableMembers(foreman.crewId, date, workspace.people, workspace.absences)
  const perWorker = work.planned.workerDays > 0 ? work.planned.plants / work.planned.workerDays : 0
  return {
    work,
    crewId: foreman.crewId,
    date,
    members: crewMembers(foreman.crewId, workspace.people),
    existing,
    target: Math.round(perWorker * available.length),
  }
}

export function initialForm(context: ReportContext, workspace: Workspace): ReportForm {
  if (context.existing) {
    const { workerIds, plants, hectares, incident, notes } = context.existing
    return { workerIds, plants, hectares, incident, notes }
  }
  const available = availableMembers(
    context.crewId,
    context.date,
    workspace.people,
    workspace.absences,
  )
  const plantsPerHa =
    context.work.planned.hectares > 0
      ? context.work.planned.plants / context.work.planned.hectares
      : 0
  return {
    workerIds: available.map((person) => person.id),
    plants: context.target,
    hectares: plantsPerHa > 0 ? Math.round((context.target / plantsPerHa) * 100) / 100 : 0,
    incident: 'ninguna',
    notes: '',
  }
}

/** Hectares follow plants at the budgeted density unless the foreman edits them. */
export function hectaresFor(plants: number, work: Work) {
  const plantsPerHa = work.planned.hectares > 0 ? work.planned.plants / work.planned.hectares : 0
  return plantsPerHa > 0 ? Math.round((plants / plantsPerHa) * 100) / 100 : 0
}
