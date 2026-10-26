import {
  absenceType,
  activeAbsences,
  assignmentDays,
  crewMembers,
  findConflicts,
  lookup,
  type Assignment,
  type Work,
  type Workspace,
} from '@/features/workspace'
import { rangesOverlap, type IsoDate } from '@/shared/lib/dates'
import { formatShortDate } from '@/shared/lib/format'

export type AssignmentStatus = 'planificada' | 'en_curso' | 'terminada'

export const assignmentStatusLabel: Record<AssignmentStatus, string> = {
  planificada: 'Planificada',
  en_curso: 'En curso',
  terminada: 'Terminada',
}

/** One assignment with everything the list and the CSV need, resolved. */
export type AssignmentRecord = {
  assignment: Assignment
  work: Work
  crewName: string
  foremanName: string
  clientName: string
  zoneName: string
  status: AssignmentStatus
  days: number
  people: number
  actualPlants: number
  absentees: string[]
}

export function assignmentStatus(assignment: Assignment, today: IsoDate): AssignmentStatus {
  if (assignment.end < today) return 'terminada'
  return assignment.start <= today ? 'en_curso' : 'planificada'
}

export function assignmentRecords(workspace: Workspace, today: IsoDate): AssignmentRecord[] {
  const find = lookup(workspace)
  const absences = activeAbsences(workspace.absences)
  return workspace.assignments
    .flatMap((assignment) => {
      const work = find.work(assignment.workId)
      if (!work) return []
      const crew = find.crew(assignment.crewId)
      const members = crewMembers(assignment.crewId, workspace.people)
      const absentees = members
        .filter((person) =>
          absences.some(
            (absence) =>
              absence.personId === person.id &&
              rangesOverlap(absence.start, absence.end, assignment.start, assignment.end),
          ),
        )
        .map((person) => person.name)
      const actualPlants = workspace.reports
        .filter(
          (report) =>
            report.workId === assignment.workId &&
            report.crewId === assignment.crewId &&
            report.date >= assignment.start &&
            report.date <= assignment.end,
        )
        .reduce((sum, report) => sum + report.plants, 0)
      return [
        {
          assignment,
          work,
          crewName: crew?.name ?? '',
          foremanName: find.person(crew?.foremanId ?? '')?.name ?? '',
          clientName: find.client(work.clientId)?.name ?? '',
          zoneName: find.zone(work.zoneId)?.name ?? '',
          status: assignmentStatus(assignment, today),
          days: assignmentDays(assignment).length,
          people: members.length,
          actualPlants,
          absentees,
        },
      ]
    })
    .sort((a, b) => b.assignment.start.localeCompare(a.assignment.start))
}

export type PlanningIssue = { id: string; assignmentId: string; text: string }

/** Problems in assignments that are not over yet: crew double-booked or people absent. */
export function planningIssues(workspace: Workspace, today: IsoDate): PlanningIssue[] {
  const find = lookup(workspace)
  return workspace.assignments
    .filter((assignment) => assignment.end >= today)
    .flatMap((assignment) => {
      const title = find.work(assignment.workId)?.title ?? 'obra'
      const crew = find.crew(assignment.crewId)?.name ?? 'Cuadrilla'
      return findConflicts(assignment, workspace.assignments, workspace.people, workspace.absences)
        .filter((c) => c.kind === 'ausencia' || assignment.id < c.assignment.id)
        .map((conflict, index): PlanningIssue => {
          const text =
            conflict.kind === 'solape'
              ? `${crew} tiene dos obras a la vez: «${title}» y «${find.work(conflict.assignment.workId)?.title ?? 'obra'}».`
              : `${conflict.person.name} (${absenceType[conflict.absence.type].toLowerCase()}, ${formatShortDate(conflict.absence.start)} – ${formatShortDate(conflict.absence.end)}) no estará en «${title}».`
          return { id: `${assignment.id}-${index}`, assignmentId: assignment.id, text }
        })
    })
}

export type PlanningSummary = {
  busyCrews: number
  crews: number
  unscheduled: number
  issues: number
  inProgress: number
}

export function planningSummary(workspace: Workspace, today: IsoDate): PlanningSummary {
  const active = workspace.assignments.filter((a) => a.start <= today && today <= a.end)
  return {
    busyCrews: new Set(active.map((a) => a.crewId)).size,
    crews: workspace.crews.length,
    unscheduled: workspace.works.filter((work) => work.status === 'pendiente').length,
    issues: planningIssues(workspace, today).length,
    inProgress: workspace.works.filter((work) => work.status === 'en_curso').length,
  }
}
