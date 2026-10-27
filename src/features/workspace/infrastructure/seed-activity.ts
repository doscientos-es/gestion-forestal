import { addDays, type IsoDate } from '@/shared/lib/dates'

import type { ActivityEvent, ActivityKind, Workspace } from '../application/model'

/** Deterministic 0–1 value so every reset produces the same follow-up history. */
function spread(seed: number) {
  const value = Math.sin(seed * 78.233) * 43_758.5453
  return value - Math.floor(value)
}

/**
 * Synthetic history of what the office sent and what the client opened. The open proposals
 * get recent activity so the follow-up views have something to show on the first visit.
 */
export function seedActivity(workspace: Workspace, today: IsoDate): ActivityEvent[] {
  const admin = workspace.people.find((person) => person.role === 'admin')?.id ?? null
  const events: ActivityEvent[] = []
  const add = (
    kind: ActivityKind,
    entity: ActivityEvent['entity'],
    entityId: string,
    day: IsoDate,
    hour: number,
    summary: string,
    actorId: string | null = admin,
  ) => {
    const time = `${String(hour).padStart(2, '0')}:${String(Math.floor(spread(events.length) * 50) + 5).padStart(2, '0')}`
    events.push({
      id: `a-${String(events.length + 1).padStart(3, '0')}`,
      at: `${day}T${time}:00.000Z`,
      kind,
      entity,
      entityId,
      actorId,
      summary,
    })
  }

  for (const [index, budget] of workspace.budgets.entries()) {
    const email = workspace.clients.find((client) => client.id === budget.clientId)?.email ?? ''
    const open = budget.id.startsWith('b-open')
    const sentOn = open
      ? addDays(today, budget.status === 'rechazado' ? -38 : -5)
      : addDays(budget.date, 1)
    if (budget.status === 'borrador') {
      add('presupuesto_creado', 'budget', budget.id, budget.date, 9, budget.number)
      continue
    }
    add('presupuesto_creado', 'budget', budget.id, budget.date, 9, budget.number)
    add('presupuesto_enviado', 'budget', budget.id, sentOn, 10, email)
    const views = open && budget.status === 'enviado' ? 3 : 1 + Math.floor(spread(index) * 3)
    for (let view = 0; view < views; view += 1) {
      const day =
        open && budget.status === 'enviado' ? addDays(today, -3 + view) : addDays(sentOn, view)
      add(
        'presupuesto_visto',
        'budget',
        budget.id,
        day,
        8 + view * 3,
        'Enlace de la propuesta',
        null,
      )
    }
    if (budget.status === 'aceptado') {
      const code = workspace.works.find((work) => work.id === budget.workId)?.code ?? ''
      add(
        'presupuesto_aceptado',
        'budget',
        budget.id,
        addDays(sentOn, 4),
        12,
        `Obra ${code} creada`,
      )
    }
    if (budget.status === 'rechazado')
      add(
        'presupuesto_rechazado',
        'budget',
        budget.id,
        addDays(sentOn, 6),
        12,
        'Rechazado por el cliente',
      )
  }

  for (const invoice of workspace.invoices) {
    add('factura_creada', 'invoice', invoice.id, addDays(invoice.date, -1), 9, invoice.reference)
    if (invoice.sentOn)
      add('factura_enviada_gestoria', 'invoice', invoice.id, invoice.sentOn, 11, invoice.reference)
    if (invoice.paidOn)
      add('factura_cobrada', 'invoice', invoice.id, invoice.paidOn, 13, invoice.reference)
  }

  return events.sort((a, b) => b.at.localeCompare(a.at))
}
