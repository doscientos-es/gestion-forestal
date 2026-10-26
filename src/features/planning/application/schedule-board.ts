import {
  absenceOn,
  assignmentOn,
  crewMembers,
  type Absence,
  type Assignment,
  type Workspace,
} from '@/features/workspace'
import { addDays, isWorkingDay, startOfWeek, type IsoDate } from '@/shared/lib/dates'

export type BoardCell = {
  date: IsoDate
  assignment: Assignment | null
  /** First day of the assignment visible in this range (to render the label once). */
  starts: boolean
  absences: { personId: string; absence: Absence }[]
  available: number
  size: number
}

export type BoardRow = { crewId: string; cells: BoardCell[] }

/** Working days for N weeks starting on the Monday of `from`. */
export function boardDays(from: IsoDate, weeks: number): IsoDate[] {
  const monday = startOfWeek(from)
  return Array.from({ length: weeks * 7 }, (_, index) => addDays(monday, index)).filter(
    isWorkingDay,
  )
}

export function buildBoard(workspace: Workspace, days: IsoDate[]): BoardRow[] {
  return workspace.crews.map((crew) => {
    const members = crewMembers(crew.id, workspace.people)
    let previous: string | null = null
    const cells = days.map((date) => {
      const assignment = assignmentOn(crew.id, date, workspace.assignments) ?? null
      const absences = members.flatMap((person) => {
        const absence = absenceOn(person.id, date, workspace.absences)
        return absence ? [{ personId: person.id, absence }] : []
      })
      const starts = Boolean(assignment) && assignment?.id !== previous
      previous = assignment?.id ?? null
      return {
        date,
        assignment,
        starts,
        absences,
        available: members.length - absences.length,
        size: members.length,
      }
    })
    return { crewId: crew.id, cells }
  })
}

export type BoardSegment =
  | { kind: 'free'; cell: BoardCell }
  | { kind: 'block'; assignment: Assignment; cells: BoardCell[] }

/** Merges consecutive days of the same assignment into one block so it reads as a single bar. */
export function boardSegments(cells: BoardCell[]): BoardSegment[] {
  const segments: BoardSegment[] = []
  for (const cell of cells) {
    const last = segments.at(-1)
    if (!cell.assignment) segments.push({ kind: 'free', cell })
    else if (last?.kind === 'block' && last.assignment.id === cell.assignment.id)
      last.cells.push(cell)
    else segments.push({ kind: 'block', assignment: cell.assignment, cells: [cell] })
  }
  return segments
}

export type AgendaSegment =
  | { kind: 'free'; cells: BoardCell[] }
  | { kind: 'block'; assignment: Assignment; cells: BoardCell[] }

/** Like `boardSegments`, but also merges consecutive free days: a phone shows a list, not a grid. */
export function agendaSegments(cells: BoardCell[]): AgendaSegment[] {
  const segments: AgendaSegment[] = []
  for (const segment of boardSegments(cells)) {
    const last = segments.at(-1)
    if (segment.kind === 'free') {
      if (last?.kind === 'free') last.cells.push(segment.cell)
      else segments.push({ kind: 'free', cells: [segment.cell] })
    } else segments.push(segment)
  }
  return segments
}

export function unscheduledWorks(workspace: Workspace) {
  return workspace.works.filter((work) => work.status === 'pendiente')
}
