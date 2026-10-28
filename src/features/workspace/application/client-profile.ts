import type { IsoDate } from '@/shared/lib/dates'

import { CommandError, cleanClientContact, type ClientInput } from './commands'
import { invoiceTotals } from './invoice-draft'
import type {
  ActivityEvent,
  Budget,
  Cents,
  Client,
  InvoiceDraft,
  Work,
  Workspace,
} from './model'
import { calculatePerformance, type WorkPerformance } from './work-performance'

/** An invoice sent to the accounting office and not collected after this many days is chased. */
export const OVERDUE_DAYS = 30

/** A client whose real margin falls this far below what the budgets promised is flagged. */
const TARGET_TOLERANCE = 0.02

const DAY_MS = 86_400_000

function daysBetween(from: IsoDate, to: IsoDate) {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS)
}

export type OverdueInvoice = {
  invoice: InvoiceDraft
  /** Total with VAT: what the client still owes. */
  total: Cents
  /** Days since it was sent. */
  days: number
}

/** Sent invoices still unpaid after `OVERDUE_DAYS`, the oldest first. */
export function overdueInvoices(
  workspace: Workspace,
  today: IsoDate,
  clientId?: string,
): OverdueInvoice[] {
  return workspace.invoices
    .filter(
      (invoice) =>
        invoice.status === 'enviada' &&
        invoice.sentOn !== null &&
        (clientId === undefined || invoice.clientId === clientId),
    )
    .map((invoice) => ({
      invoice,
      total: invoiceTotals(invoice).total,
      days: daysBetween(invoice.sentOn ?? today, today),
    }))
    .filter((item) => item.days > OVERDUE_DAYS)
    .sort((a, b) => b.days - a.days)
}

/** Everything that happened around a client's proposals, invoices and works, newest first. */
export function clientActivity(workspace: Workspace, clientId: string): ActivityEvent[] {
  const owns = (event: ActivityEvent) => {
    if (event.entity === 'budget')
      return workspace.budgets.find((item) => item.id === event.entityId)?.clientId === clientId
    if (event.entity === 'work')
      return workspace.works.find((item) => item.id === event.entityId)?.clientId === clientId
    return workspace.invoices.find((item) => item.id === event.entityId)?.clientId === clientId
  }
  return workspace.activity.filter(owns).sort((a, b) => b.at.localeCompare(a.at))
}

export type ClientYear = {
  year: number
  works: number
  contracted: Cents
  margin: Cents
  marginRate: number
}

/** Edits every detail of a client. The name must stay unique. */
export function updateClient(workspace: Workspace, clientId: string, input: ClientInput): Workspace {
  if (!workspace.clients.some((client) => client.id === clientId))
    throw new CommandError('Cliente no encontrado.')
  const name = input.name.trim()
  if (!name) throw new CommandError('Escribe el nombre del cliente.')
  if (
    workspace.clients.some(
      (client) => client.id !== clientId && client.name.trim().toLowerCase() === name.toLowerCase(),
    )
  )
    throw new CommandError('Ya existe un cliente con ese nombre.')
  const contact = cleanClientContact(input)
  return {
    ...workspace,
    clients: workspace.clients.map((client) =>
      client.id === clientId
        ? {
            ...client,
            name,
            kind: input.kind,
            taxId: input.taxId.trim(),
            town: input.town.trim(),
            ...contact,
          }
        : client,
    ),
  }
}

export type ClientWork = { work: Work; performance: WorkPerformance }

export type ClientOverview = {
  client: Client
  budgets: Budget[]
  /** Accepted budgets: what the client has actually contracted. */
  accepted: Budget[]
  /** Share of answered proposals that were accepted; null while none has been answered. */
  acceptanceRate: number | null
  works: ClientWork[]
  /** Sum of the prices of the works contracted. */
  contracted: Cents
  /** Invoiced (excluding VAT) once the draft has been sent to the accounting office. */
  invoiced: Cents
  /** Invoiced and already collected (excluding VAT). */
  collected: Cents
  /** Projected margin of the works over their price; null without works. */
  marginRate: number | null
  /** Projected margin in euros across all works. */
  margin: Cents
  /** Plants per worker-day against the budget, weighted by days; null without reports. */
  yieldDeviation: number | null
  /** Margin the budgets of these works promised; null without works. */
  plannedMarginRate: number | null
  /** True when the real margin is clearly below what was promised. */
  belowTarget: boolean
  /** Sent invoices unpaid after `OVERDUE_DAYS`. */
  overdue: OverdueInvoice[]
  overdueTotal: Cents
  /** One row per campaign, oldest first. */
  years: ClientYear[]
}

/** Everything the office needs to know about a client: what they contracted, billed and yielded. */
export function clientOverview(
  workspace: Workspace,
  client: Client,
  today: IsoDate,
): ClientOverview {
  const budgets = workspace.budgets.filter((budget) => budget.clientId === client.id)
  const accepted = budgets.filter((budget) => budget.status === 'aceptado')
  const rejected = budgets.filter((budget) => budget.status === 'rechazado')
  const works = workspace.works
    .filter((work) => work.clientId === client.id)
    .map((work) => ({
      work,
      performance: calculatePerformance(work, workspace.reports, workspace.people),
    }))
    .sort((a, b) => b.work.year - a.work.year || b.work.code.localeCompare(a.work.code))
  const invoices = workspace.invoices.filter(
    (invoice) => invoice.clientId === client.id && invoice.status !== 'borrador',
  )
  const base = (status?: 'cobrada') =>
    invoices
      .filter((invoice) => !status || invoice.status === status)
      .reduce((sum, invoice) => sum + invoiceTotals(invoice).base, 0)
  const contracted = works.reduce((sum, item) => sum + item.work.planned.price, 0)
  const margin = works.reduce((sum, item) => sum + item.performance.projectedMargin, 0)
  const days = works.reduce((sum, item) => sum + item.performance.workerDays, 0)
  const withYield = works.filter(
    (item) => item.performance.workerDays > 0 && item.performance.plannedYield > 0,
  )
  const weighted = withYield.reduce(
    (sum, item) => sum + item.performance.yieldDeviation * item.performance.workerDays,
    0,
  )
  const weightDays = withYield.reduce((sum, item) => sum + item.performance.workerDays, 0)
  const answered = accepted.length + rejected.length
  const plannedMargin = works.reduce((sum, item) => sum + item.performance.plannedMargin, 0)
  const marginRate = contracted > 0 ? margin / contracted : null
  const plannedMarginRate = contracted > 0 ? plannedMargin / contracted : null
  const overdue = overdueInvoices(workspace, today, client.id)
  const years = [...new Set(works.map((item) => item.work.year))]
    .sort((a, b) => a - b)
    .map((year): ClientYear => {
      const own = works.filter((item) => item.work.year === year)
      const price = own.reduce((sum, item) => sum + item.work.planned.price, 0)
      const yearMargin = own.reduce((sum, item) => sum + item.performance.projectedMargin, 0)
      return {
        year,
        works: own.length,
        contracted: price,
        margin: yearMargin,
        marginRate: price > 0 ? yearMargin / price : 0,
      }
    })
  return {
    client,
    budgets,
    accepted,
    acceptanceRate: answered > 0 ? accepted.length / answered : null,
    works,
    contracted,
    invoiced: base(),
    collected: base('cobrada'),
    marginRate,
    margin,
    yieldDeviation: days > 0 && weightDays > 0 ? weighted / weightDays : null,
    plannedMarginRate,
    belowTarget:
      marginRate !== null &&
      plannedMarginRate !== null &&
      marginRate < plannedMarginRate - TARGET_TOLERANCE,
    overdue,
    overdueTotal: overdue.reduce((sum, item) => sum + item.total, 0),
    years,
  }
}
