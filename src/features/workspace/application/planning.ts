import { addWorkingDays, rangesOverlap, workingDaysBetween, type IsoDate } from '@/shared/lib/dates'

import type { Absence, Assignment, Crew, Person, Work } from './model'

export function crewMembers(crewId: string, people: Person[]) {
  return people.filter((person) => person.crewId === crewId)
}

export function activeAbsences(absences: Absence[]) {
  return absences.filter((absence) => absence.status !== 'rechazada')
}

export function isAbsentOn(personId: string, date: IsoDate, absences: Absence[]) {
  return activeAbsences(absences).some(
    (absence) => absence.personId === personId && absence.start <= date && date <= absence.end,
  )
}

export function absenceOn(personId: string, date: IsoDate, absences: Absence[]) {
  return activeAbsences(absences).find(
    (absence) => absence.personId === personId && absence.start <= date && date <= absence.end,
  )
}

export function availableMembers(
  crewId: string,
  date: IsoDate,
  people: Person[],
  absences: Absence[],
) {
  return crewMembers(crewId, people).filter((person) => !isAbsentOn(person.id, date, absences))
}

export type AssignmentConflict =
  | { kind: 'solape'; assignment: Assignment }
  | { kind: 'ausencia'; absence: Absence; person: Person }

export function findConflicts(
  draft: Pick<Assignment, 'crewId' | 'start' | 'end'> & { id?: string },
  assignments: Assignment[],
  people: Person[],
  absences: Absence[],
): AssignmentConflict[] {
  const overlaps: AssignmentConflict[] = assignments
    .filter(
      (item) =>
        item.id !== draft.id &&
        item.crewId === draft.crewId &&
        rangesOverlap(item.start, item.end, draft.start, draft.end),
    )
    .map((assignment) => ({ kind: 'solape', assignment }))
  const members = crewMembers(draft.crewId, people)
  const absenceConflicts: AssignmentConflict[] = activeAbsences(absences).flatMap((absence) => {
    const person = members.find((member) => member.id === absence.personId)
    if (!person || !rangesOverlap(absence.start, absence.end, draft.start, draft.end)) return []
    return [{ kind: 'ausencia', absence, person }]
  })
  return [...overlaps, ...absenceConflicts]
}

/** Suggested end date for a crew starting on `start`, from the budgeted crew days. */
export function suggestedEnd(work: Work, start: IsoDate) {
  return addWorkingDays(start, Math.max(0, work.planned.crewDays - 1))
}

export function assignmentDays(assignment: Pick<Assignment, 'start' | 'end'>) {
  return workingDaysBetween(assignment.start, assignment.end)
}

export function assignmentOn(crewId: string, date: IsoDate, assignments: Assignment[]) {
  return assignments.find(
    (item) => item.crewId === crewId && item.start <= date && date <= item.end,
  )
}

export function crewForPerson(personId: string, people: Person[], crews: Crew[]) {
  const person = people.find((item) => item.id === personId)
  return crews.find((crew) => crew.id === person?.crewId) ?? null
}

/** Working days requested inside an absence (weekends excluded). */
export function absenceWorkingDays(absence: Pick<Absence, 'start' | 'end'>) {
  return workingDaysBetween(absence.start, absence.end).length
}

export const ANNUAL_VACATION_DAYS = 22

export function vacationBalance(personId: string, year: number, absences: Absence[]) {
  const used = absences
    .filter(
      (absence) =>
        absence.personId === personId &&
        absence.type === 'vacaciones' &&
        absence.status !== 'rechazada' &&
        absence.start.startsWith(String(year)),
    )
    .reduce((sum, absence) => sum + absenceWorkingDays(absence), 0)
  return { used, total: ANNUAL_VACATION_DAYS, remaining: ANNUAL_VACATION_DAYS - used }
}
