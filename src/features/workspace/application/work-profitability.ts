import { invoiceTotals } from './invoice-draft'
import type { Work, Workspace } from './model'
import { calculatePerformance, type WorkPerformance } from './work-performance'

export function isFinishedWork(work: Work) {
  return work.status === 'terminada' || work.status === 'facturada'
}

export function hasWorkProjection(work: Work, performance: WorkPerformance) {
  return performance.reportCount > 0 && (isFinishedWork(work) || performance.progress > 0)
}

/** Operational estimate, not accounting profit: materials and travel use budget unit costs. */
export function workProfitability(workspace: Workspace, work: Work) {
  const performance = calculatePerformance(work, workspace.reports, workspace.people)
  const reports = workspace.reports.filter((report) => report.workId === work.id)
  const dates = reports.map((report) => report.date).sort()
  const hasData = reports.length > 0
  const finished = isFinishedWork(work)
  const progress = Math.min(1, Math.max(0, performance.progress))
  const canProject = hasWorkProjection(work, performance)
  const projectedWorkerDays = !canProject
    ? null
    : finished
      ? performance.workerDays
      : performance.workerDays / progress
  const projectedCrewDays = !canProject
    ? null
    : finished
      ? performance.crewDays
      : performance.crewDays / progress
  const budgetAtProgress = Math.round(work.planned.totalCost * progress)
  const expenses = workspace.expenses.filter((expense) => expense.workId === work.id)
  const expenseTotal = (status: 'aprobado' | 'pendiente') =>
    expenses
      .filter((expense) => expense.status === status)
      .reduce((sum, expense) => sum + expense.amount, 0)
  const invoices = workspace.invoices.filter((invoice) => invoice.workId === work.id)
  const invoiceBase = (status: 'issued' | 'cobrada') =>
    invoices
      .filter((invoice) =>
        status === 'issued' ? invoice.status !== 'borrador' : invoice.status === status,
      )
      .reduce((sum, invoice) => sum + invoiceTotals(invoice).base, 0)

  return {
    work,
    performance,
    hasData,
    finished,
    canProject,
    startedOn: dates[0] ?? null,
    reportDays: new Set(dates).size,
    projectedWorkerDays,
    projectedCrewDays,
    remainingWorkerDays:
      projectedWorkerDays === null
        ? null
        : Math.max(0, projectedWorkerDays - performance.workerDays),
    budgetAtProgress,
    costDeviation: hasData ? performance.totalCost - budgetAtProgress : null,
    earnedValue: hasData ? Math.round(work.planned.price * progress) : null,
    costPerHectare:
      hasData && performance.hectares > 0 ? performance.totalCost / performance.hectares : null,
    workerDaysPerHectare:
      hasData && performance.hectares > 0 ? performance.workerDays / performance.hectares : null,
    projectedCost: canProject ? performance.projectedCost : null,
    projectedMargin: canProject ? performance.projectedMargin : null,
    projectedMarginRate:
      canProject && work.planned.price > 0 ? performance.projectedMarginRate : null,
    // Kept separate: a receipt may cover material/travel already valued in the daily reports.
    approvedExpenses: expenseTotal('aprobado'),
    pendingExpenses: expenseTotal('pendiente'),
    invoiced: invoiceBase('issued'),
    collected: invoiceBase('cobrada'),
  }
}

export type WorkProfitability = ReturnType<typeof workProfitability>

function workKind(workspace: Workspace, work: Work) {
  const budget = workspace.budgets.find((item) => item.id === work.budgetId)
  return budget && budget.lines.length > 0
    ? [...new Set(budget.lines.map((line) => line.kind))].sort().join(',')
    : work.planned.plants > 0
      ? 'plantacion'
      : 'tratamiento'
}

/** Closed, earlier jobs only; never compare an ongoing estimate with another ongoing estimate. */
export function clientWorkComparison(workspace: Workspace, work: Work, sameZone = false) {
  const current = workProfitability(workspace, work)
  const cutoff =
    current.startedOn ??
    workspace.budgets.find((budget) => budget.id === work.budgetId)?.date ??
    `${work.year}-01-01`
  const kind = workKind(workspace, work)
  const history = workspace.works
    .filter(
      (other) =>
        other.id !== work.id &&
        other.clientId === work.clientId &&
        isFinishedWork(other) &&
        (!sameZone || other.zoneId === work.zoneId) &&
        workKind(workspace, other) === kind,
    )
    .map((other) => workProfitability(workspace, other))
    .filter(
      (item) =>
        item.hasData &&
        (item.work.finishedOn ?? item.performance.lastReportOn ?? cutoff) < cutoff &&
        (item.performance.lastReportOn ?? cutoff) < cutoff,
    )
    .sort((a, b) =>
      (b.work.finishedOn ?? b.performance.lastReportOn ?? '').localeCompare(
        a.work.finishedOn ?? a.performance.lastReportOn ?? '',
      ),
    )
  const measurable = history.filter((item) => item.costPerHectare !== null)
  const hectares = measurable.reduce((sum, item) => sum + item.performance.hectares, 0)
  const historicalCostPerHectare =
    hectares > 0
      ? measurable.reduce((sum, item) => sum + item.performance.totalCost, 0) / hectares
      : null
  const historicalWorkerDaysPerHectare =
    hectares > 0
      ? measurable.reduce((sum, item) => sum + item.performance.workerDays, 0) / hectares
      : null
  const priced = history.filter((item) => item.work.planned.price > 0)
  const revenue = priced.reduce((sum, item) => sum + item.work.planned.price, 0)
  const historicalMarginRate =
    revenue > 0
      ? priced.reduce((sum, item) => sum + item.performance.projectedMargin, 0) / revenue
      : null
  return {
    current,
    history,
    historicalCostPerHectare,
    historicalWorkerDaysPerHectare,
    historicalMarginRate,
    costPerHectareChange:
      current.costPerHectare !== null &&
      historicalCostPerHectare !== null &&
      historicalCostPerHectare > 0
        ? current.costPerHectare / historicalCostPerHectare - 1
        : null,
    marginRateChange:
      current.projectedMarginRate !== null && historicalMarginRate !== null
        ? current.projectedMarginRate - historicalMarginRate
        : null,
  }
}
