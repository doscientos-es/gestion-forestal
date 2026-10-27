import {
  activityKind,
  budgetTracking,
  estimateStoredBudget,
  eventDate,
  type ActivityEvent,
  type Budget,
  type Cents,
  type Workspace,
} from '@/features/workspace'
import { addDays, type IsoDate } from '@/shared/lib/dates'

export type FeedFilter = 'todo' | 'envios' | 'vistas' | 'facturas'

const sends = new Set<ActivityEvent['kind']>([
  'presupuesto_enviado',
  'factura_enviada_cliente',
  'factura_enviada_gestoria',
  'informe_enviado',
])

export type ActivityDocument =
  | { label: string; to: '/presupuestos/$budgetId'; budgetId: string }
  | { label: string; to: '/obras/$workId'; workId: string }
  | { label: string; to: '/facturas' }

/** Human name of the budget or invoice an event is about, and where to open it. */
export function activityDocument(workspace: Workspace, event: ActivityEvent): ActivityDocument {
  if (event.entity === 'budget') {
    const budget = workspace.budgets.find((item) => item.id === event.entityId)
    return {
      label: budget ? `${budget.number} · ${budget.title}` : 'Presupuesto eliminado',
      to: '/presupuestos/$budgetId',
      budgetId: event.entityId,
    }
  }
  if (event.entity === 'work') {
    const work = workspace.works.find((item) => item.id === event.entityId)
    return {
      label: work ? `${work.code} · ${work.title}` : 'Obra eliminada',
      to: '/obras/$workId',
      workId: event.entityId,
    }
  }
  const invoice = workspace.invoices.find((item) => item.id === event.entityId)
  const client = workspace.clients.find((item) => item.id === invoice?.clientId)
  return {
    label: invoice ? `${invoice.reference} · ${client?.name ?? ''}` : 'Factura eliminada',
    to: '/facturas',
  }
}

export function matchesFilter(event: ActivityEvent, filter: FeedFilter) {
  if (filter === 'envios') return sends.has(event.kind)
  if (filter === 'vistas')
    return event.kind === 'presupuesto_visto' || event.kind === 'informe_visto'
  if (filter === 'facturas') return event.entity === 'invoice'
  return true
}

export function filterActivity(workspace: Workspace, filter: FeedFilter, query: string) {
  const text = query.trim().toLocaleLowerCase('es')
  return workspace.activity
    .filter((event) => matchesFilter(event, filter))
    .filter((event) => {
      if (!text) return true
      const actor = workspace.people.find((person) => person.id === event.actorId)?.name ?? ''
      const haystack = `${activityKind[event.kind].label} ${activityDocument(workspace, event).label} ${actor} ${event.summary}`
      return haystack.toLocaleLowerCase('es').includes(text)
    })
    .sort((a, b) => b.at.localeCompare(a.at))
}

export type FollowUp = {
  /** Sent proposals the client has not answered yet, oldest send first. */
  waiting: { budget: Budget; sentAt: string | null; views: number; price: Cents }[]
  waitingValue: Cents
  /** Waiting proposals nobody has opened: the ones worth a phone call. */
  unopened: number
  viewsThisWeek: number
}

/** What the office should chase: proposals sent and still unanswered, and how engaged clients are. */
export function followUpSummary(workspace: Workspace, today: IsoDate): FollowUp {
  const waiting = workspace.budgets
    .filter((budget) => budget.status === 'enviado')
    .map((budget) => {
      const tracking = budgetTracking(workspace.activity, budget.id)
      return {
        budget,
        sentAt: tracking.sentAt,
        views: tracking.views,
        price: estimateStoredBudget(budget, workspace.species).price,
      }
    })
    .sort((a, b) => (a.sentAt ?? '').localeCompare(b.sentAt ?? ''))
  const weekAgo = addDays(today, -7)
  return {
    waiting,
    waitingValue: waiting.reduce((sum, item) => sum + item.price, 0),
    unopened: waiting.filter((item) => item.views === 0).length,
    viewsThisWeek: workspace.activity.filter(
      (event) => event.kind === 'presupuesto_visto' && eventDate(event) >= weekAgo,
    ).length,
  }
}
