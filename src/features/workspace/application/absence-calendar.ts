import { eachDay, isWorkingDay, rangesOverlap, type IsoDate } from '@/shared/lib/dates'

import type { Absence, Person, Workspace } from './model'
import {
  ANNUAL_VACATION_DAYS,
  absenceWorkingDays,
  activeAbsences,
  crewMembers,
  isAbsentOn,
  vacationBalance,
} from './planning'

/** A crew needs at least this share of its people on a working day to keep producing. */
const MIN_COVERAGE = 0.6

export type AbsenceImpact = {
  /** Other people of the same crew who are away at the same time. */
  overlapping: { person: Person; absence: Absence }[]
  crewSize: number
  /** Fewest people available on any working day of the absence. */
  minAvailable: number
  /** True when the crew drops below the coverage the work needs. */
  understaffed: boolean
}

/** What approving this absence would do to the person's crew. */
export function absenceImpact(absence: Absence, workspace: Workspace): AbsenceImpact | null {
  const person = workspace.people.find((item) => item.id === absence.personId)
  if (!person?.crewId) return null
  const members = crewMembers(person.crewId, workspace.people)
  const others = activeAbsences(workspace.absences).filter(
    (item) =>
      item.id !== absence.id &&
      item.personId !== person.id &&
      members.some((member) => member.id === item.personId) &&
      rangesOverlap(item.start, item.end, absence.start, absence.end),
  )
  const overlapping = others.flatMap((item) => {
    const who = members.find((member) => member.id === item.personId)
    return who ? [{ person: who, absence: item }] : []
  })
  // Judge as if this absence were already approved, whatever its current status.
  const hypothetical = [...others, absence]
  const days = eachDay(absence.start, absence.end).filter(isWorkingDay)
  const minAvailable = days.length
    ? Math.min(
        ...days.map(
          (day) => members.filter((member) => !isAbsentOn(member.id, day, hypothetical)).length,
        ),
      )
    : members.length
  return {
    overlapping,
    crewSize: members.length,
    minAvailable,
    understaffed: members.length > 0 && minAvailable / members.length < MIN_COVERAGE,
  }
}

export type VacationRow = {
  person: Person
  approved: number
  pending: number
  remaining: number
  total: number
}

/** Vacation days per person: taken or approved, still waiting for an answer, and left. */
export function vacationRows(workspace: Workspace, year: number): VacationRow[] {
  return workspace.people
    .filter((person) => person.role !== 'admin')
    .map((person) => {
      const pending = workspace.absences
        .filter(
          (absence) =>
            absence.personId === person.id &&
            absence.type === 'vacaciones' &&
            absence.status === 'solicitada' &&
            absence.start.startsWith(String(year)),
        )
        .reduce((sum, absence) => sum + absenceWorkingDays(absence), 0)
      const balance = vacationBalance(person.id, year, workspace.absences)
      return {
        person,
        approved: balance.used - pending,
        pending,
        remaining: balance.remaining,
        total: ANNUAL_VACATION_DAYS,
      }
    })
    .sort((a, b) => a.remaining - b.remaining)
}

export type CalendarCell = {
  date: IsoDate
  weekend: boolean
  absence: Absence | null
  /** Two or more people of the crew are away this day. */
  crowded: boolean
}

export type CalendarRow = { person: Person; cells: CalendarCell[] }

/** One row per person of the crew for the days given, flagging days with several people away. */
export function crewCalendar(crewId: string, days: IsoDate[], workspace: Workspace): CalendarRow[] {
  const members = crewMembers(crewId, workspace.people)
  const active = activeAbsences(workspace.absences)
  const awayOn = (day: IsoDate) =>
    members.filter((member) => isAbsentOn(member.id, day, active)).length
  return members.map((person) => ({
    person,
    cells: days.map((date) => ({
      date,
      weekend: !isWorkingDay(date),
      absence:
        active.find(
          (item) => item.personId === person.id && item.start <= date && date <= item.end,
        ) ?? null,
      crowded: isWorkingDay(date) && awayOn(date) >= 2,
    })),
  }))
}
