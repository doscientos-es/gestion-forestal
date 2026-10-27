import {
  addDays,
  eachDay,
  isWorkingDay,
  rangesOverlap,
  startOfWeek,
  type IsoDate,
} from '@/shared/lib/dates'

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

export type DayLoad = 'libre' | 'varios' | 'critico'

export type GridDay = {
  date: IsoDate
  inMonth: boolean
  weekend: boolean
  /** Active absences of the people shown, newest request last. */
  away: { absence: Absence; person: Person }[]
  /** `varios`: two or more of one crew away. `critico`: a crew is below the coverage it needs. */
  load: DayLoad
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

/**
 * Month as weeks starting on Monday, for the crews given. Each day lists who is away and how
 * loaded the day is, so the office sees at a glance where holidays pile up.
 */
export function monthGrid(
  year: number,
  month: number,
  crewIds: string[],
  workspace: Workspace,
): GridDay[][] {
  const first = `${year}-${pad(month)}-01`
  const last = `${year}-${pad(month)}-${pad(new Date(Date.UTC(year, month, 0)).getUTCDate())}`
  const gridStart = startOfWeek(first)
  const gridEnd = addDays(startOfWeek(last), 6)
  const people = workspace.people.filter((p) => p.crewId && crewIds.includes(p.crewId))
  const active = activeAbsences(workspace.absences)
  const days = eachDay(gridStart, gridEnd).map<GridDay>((date) => {
    const away = active
      .filter((item) => item.start <= date && date <= item.end)
      .flatMap((absence) => {
        const person = people.find((item) => item.id === absence.personId)
        return person ? [{ absence, person }] : []
      })
    let load: DayLoad = 'libre'
    if (isWorkingDay(date)) {
      for (const crewId of crewIds) {
        const size = crewMembers(crewId, workspace.people).length
        const out = away.filter((item) => item.person.crewId === crewId).length
        if (out >= 2) load = load === 'critico' ? load : 'varios'
        if (size > 0 && (size - out) / size < MIN_COVERAGE) load = 'critico'
      }
    }
    return {
      date,
      inMonth: date >= first && date <= last,
      weekend: !isWorkingDay(date),
      away,
      load,
    }
  })
  return Array.from({ length: days.length / 7 }, (_, week) => days.slice(week * 7, week * 7 + 7))
}
