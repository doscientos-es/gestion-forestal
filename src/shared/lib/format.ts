import type { IsoDate } from './dates'

const LOCALE = 'es-ES'

const moneyRounded = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})
const moneyPrecise = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Amounts are stored in cents. */
export function formatMoney(cents: number, precise = false) {
  return (precise ? moneyPrecise : moneyRounded).format(cents / 100)
}

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits }).format(value)
}

export function formatPercent(fraction: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits }).format(fraction)
}

export function formatSignedPercent(fraction: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(LOCALE, {
    style: 'percent',
    maximumFractionDigits,
    signDisplay: 'exceptZero',
  }).format(fraction)
}

function toDate(iso: IsoDate) {
  return new Date(`${iso}T00:00:00Z`)
}

/** «12 may» */
export function formatShortDate(iso: IsoDate) {
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(toDate(iso))
    .replace('.', '')
}

/** «12 may 2026» */
export function formatDate(iso: IsoDate) {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    toDate(iso),
  )
}

/** «4 nov, 10:30» from an ISO date-time, always in the office's time zone. */
export function formatDateTime(isoDateTime: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  })
    .format(new Date(isoDateTime))
    .replace('.', '')
}

/** «martes, 3 de noviembre» */
export function formatLongDate(iso: IsoDate) {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(toDate(iso))
}

/** «noviembre de 2026» */
export function formatMonthYear(year: number, month: number) {
  return new Intl.DateTimeFormat(LOCALE, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

/** «lun» */
export function formatWeekday(iso: IsoDate) {
  return new Intl.DateTimeFormat(LOCALE, { weekday: 'short', timeZone: 'UTC' })
    .format(toDate(iso))
    .replace('.', '')
}

const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2026, index, 1)))
    .replace('.', ''),
)

export function formatMonth(month: number) {
  return monthNames[month - 1] ?? String(month)
}

export function pluralize(count: number, singular: string, plural: string) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}
