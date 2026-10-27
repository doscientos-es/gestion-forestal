import { csvText, toCsv } from '@/shared/lib/csv'
import type { Tone } from '@/shared/lib/tone'

import type { Context } from './commands'
import type { ActivityEntity, ActivityEvent, ActivityKind, Workspace } from './model'

export const activityKind: Record<ActivityKind, { label: string; tone: Tone }> = {
  presupuesto_creado: { label: 'Presupuesto creado', tone: 'gray' },
  presupuesto_importado: { label: 'Presupuesto importado', tone: 'gray' },
  presupuesto_enviado: { label: 'Enviado al cliente', tone: 'blue' },
  presupuesto_visto: { label: 'Visto por el cliente', tone: 'purple' },
  presupuesto_aceptado: { label: 'Presupuesto aceptado', tone: 'green' },
  presupuesto_rechazado: { label: 'Presupuesto rechazado', tone: 'red' },
  factura_creada: { label: 'Borrador creado', tone: 'gray' },
  factura_enviada_cliente: { label: 'Copia enviada por correo', tone: 'blue' },
  factura_enviada_gestoria: { label: 'Enviada a la gestoría', tone: 'blue' },
  factura_cobrada: { label: 'Cobrada', tone: 'green' },
  informe_enviado: { label: 'Informe de obra enviado', tone: 'blue' },
  informe_visto: { label: 'Informe visto por el cliente', tone: 'purple' },
}

export type ActivityInput = Pick<ActivityEvent, 'kind' | 'entity' | 'entityId' | 'summary'> & {
  /** Overrides the signed-in person, e.g. `null` for something the client did. */
  actorId?: string | null
}

/** Prepends events (newest first) stamped with the command's clock and signed-in person. */
export function logActivity(
  workspace: Workspace,
  inputs: ActivityInput | ActivityInput[],
  context: Context,
): Workspace {
  const list = Array.isArray(inputs) ? inputs : [inputs]
  if (list.length === 0) return workspace
  const events: ActivityEvent[] = list.map((input) => ({
    id: context.id(),
    at: context.now,
    kind: input.kind,
    entity: input.entity,
    entityId: input.entityId,
    actorId: input.actorId === undefined ? context.actorId : input.actorId,
    summary: input.summary,
  }))
  return { ...workspace, activity: [...events.reverse(), ...workspace.activity] }
}

export function activityFor(activity: ActivityEvent[], entity: ActivityEntity, entityId: string) {
  return activity
    .filter((event) => event.entity === entity && event.entityId === entityId)
    .sort((a, b) => b.at.localeCompare(a.at))
}

export type BudgetTracking = {
  /** Last time it was sent by email, or null if never. */
  sentAt: string | null
  sentTo: string
  sentCount: number
  views: number
  lastViewAt: string | null
}

/** What happened to a proposal after it left the office: sends and client opens. */
export function budgetTracking(activity: ActivityEvent[], budgetId: string): BudgetTracking {
  const events = activityFor(activity, 'budget', budgetId)
  const sent = events.filter((event) => event.kind === 'presupuesto_enviado')
  const views = events.filter((event) => event.kind === 'presupuesto_visto')
  return {
    sentAt: sent[0]?.at ?? null,
    sentTo: sent[0]?.summary ?? '',
    sentCount: sent.length,
    views: views.length,
    lastViewAt: views[0]?.at ?? null,
  }
}

/** Date part of an event timestamp, as the `IsoDate` the formatters expect. */
export function eventDate(event: Pick<ActivityEvent, 'at'>) {
  return event.at.slice(0, 10)
}

export function activityToCsv(
  events: ActivityEvent[],
  resolve: { person: (id: string) => string; entity: (event: ActivityEvent) => string },
) {
  return toCsv(
    ['Fecha', 'Hora', 'Evento', 'Documento', 'Quién', 'Detalle'],
    events.map((event) => [
      event.at.slice(0, 10),
      event.at.slice(11, 16),
      csvText(activityKind[event.kind].label),
      csvText(resolve.entity(event)),
      csvText(event.actorId ? resolve.person(event.actorId) : 'Cliente / sistema'),
      csvText(event.summary),
    ]),
  )
}
