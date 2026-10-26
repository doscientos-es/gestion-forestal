/** ISO calendar date (YYYY-MM-DD). Calculations use UTC to avoid DST shifts. */
export type IsoDate = string

const DAY_MS = 86_400_000

function parse(iso: IsoDate) {
  return new Date(`${iso}T00:00:00Z`)
}

export function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10)
}

export function localToday(now = new Date()): IsoDate {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return toIsoDate(new Date(parse(iso).getTime() + days * DAY_MS))
}

/** 0 = domingo … 6 = sábado. */
export function weekday(iso: IsoDate) {
  return parse(iso).getUTCDay()
}

export function isWorkingDay(iso: IsoDate) {
  const day = weekday(iso)
  return day !== 0 && day !== 6
}

export function startOfWeek(iso: IsoDate): IsoDate {
  const day = weekday(iso)
  return addDays(iso, day === 0 ? -6 : 1 - day)
}

/** Weekends are not operational: they resolve to the previous Friday. */
export function operationalDate(iso: IsoDate): IsoDate {
  const day = weekday(iso)
  if (day === 6) return addDays(iso, -1)
  if (day === 0) return addDays(iso, -2)
  return iso
}

export function nextWorkingDay(iso: IsoDate): IsoDate {
  let current = addDays(iso, 1)
  while (!isWorkingDay(current)) current = addDays(current, 1)
  return current
}

export function addWorkingDays(iso: IsoDate, amount: number): IsoDate {
  let current = iso
  let remaining = Math.abs(amount)
  const step = amount >= 0 ? 1 : -1
  while (remaining > 0) {
    current = addDays(current, step)
    if (isWorkingDay(current)) remaining -= 1
  }
  return current
}

export function eachDay(start: IsoDate, end: IsoDate): IsoDate[] {
  const days: IsoDate[] = []
  for (let current = start; current <= end; current = addDays(current, 1)) days.push(current)
  return days
}

export function workingDaysBetween(start: IsoDate, end: IsoDate): IsoDate[] {
  return eachDay(start, end).filter(isWorkingDay)
}

export function rangesOverlap(aStart: IsoDate, aEnd: IsoDate, bStart: IsoDate, bEnd: IsoDate) {
  return aStart <= bEnd && bStart <= aEnd
}

export function yearOf(iso: IsoDate) {
  return Number(iso.slice(0, 4))
}

export function monthOf(iso: IsoDate) {
  return Number(iso.slice(5, 7))
}
