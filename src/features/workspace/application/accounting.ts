import { monthOf, yearOf, type IsoDate } from '@/shared/lib/dates'

import { invoiceTotals } from './invoice-draft'
import type { Cents, Workspace } from './model'

export type Quarter = 1 | 2 | 3 | 4
export type AccountingMetric = 'income' | 'expenses' | 'result'

export type Period = { income: Cents; expenses: Cents; result: Cents }

export const quarters: Quarter[] = [1, 2, 3, 4]

export function quarterOf(date: IsoDate): Quarter {
  return Math.ceil(monthOf(date) / 3) as Quarter
}

/** Issued invoices only (drafts are not income yet), VAT excluded, dated on the invoice date. */
function incomeEntries(workspace: Workspace) {
  return workspace.invoices
    .filter((invoice) => invoice.status !== 'borrador')
    .map((invoice) => ({
      date: invoice.date,
      amount: invoiceTotals(invoice).base,
    }))
}

/** Approved expenses only, as paid (VAT included). */
function expenseEntries(workspace: Workspace) {
  return workspace.expenses
    .filter((expense) => expense.status === 'aprobado')
    .map((expense) => ({ date: expense.date, amount: expense.amount }))
}

export function accountingYears(workspace: Workspace) {
  const dates = [...incomeEntries(workspace), ...expenseEntries(workspace)].map((entry) =>
    yearOf(entry.date),
  )
  return [...new Set(dates)].sort((a, b) => a - b)
}

function emptyPeriod(): Period {
  return { income: 0, expenses: 0, result: 0 }
}

/** Totals of a year, or of one quarter of it. */
export function periodTotals(workspace: Workspace, year: number, quarter?: Quarter): Period {
  const inside = (date: IsoDate) =>
    yearOf(date) === year && (quarter === undefined || quarterOf(date) === quarter)
  const total = emptyPeriod()
  for (const entry of incomeEntries(workspace)) if (inside(entry.date)) total.income += entry.amount
  for (const entry of expenseEntries(workspace))
    if (inside(entry.date)) total.expenses += entry.amount
  total.result = total.income - total.expenses
  return total
}

export type QuarterPoint = { quarter: Quarter } & Record<string, number>

/** One row per quarter with one series per year (key = year as string). */
export function quarterlyComparison(
  workspace: Workspace,
  years: number[],
  metric: AccountingMetric,
): QuarterPoint[] {
  return quarters.map((quarter) => {
    const point: QuarterPoint = { quarter }
    for (const year of years) point[String(year)] = periodTotals(workspace, year, quarter)[metric]
    return point
  })
}

export type MonthPoint = { month: number } & Period

/** Income and expenses of every month of a year. */
export function monthlyAccounts(workspace: Workspace, year: number): MonthPoint[] {
  const points: MonthPoint[] = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    ...emptyPeriod(),
  }))
  const add = (date: IsoDate, amount: Cents, key: 'income' | 'expenses') => {
    if (yearOf(date) !== year) return
    const point = points[monthOf(date) - 1]
    if (point) point[key] += amount
  }
  for (const entry of incomeEntries(workspace)) add(entry.date, entry.amount, 'income')
  for (const entry of expenseEntries(workspace)) add(entry.date, entry.amount, 'expenses')
  for (const point of points) point.result = point.income - point.expenses
  return points
}
