import { addDays, type IsoDate } from '@/shared/lib/dates'

import type { Workspace } from '../application/model'
import {
  addIncidentVisit,
  closeServiceIncident,
  createServiceIncident,
} from '../application/service-incidents'

/** Examples for new demos only; upgrading an existing demo never resets the user's data. */
export function seedIncidents(workspace: Workspace, today: IsoDate) {
  const admin = workspace.people.find((person) => person.role === 'admin')
  const worker = workspace.people.find((person) => person.role === 'capataz')
  if (!admin || !worker) return []
  let next = workspace
  let sequence = 0
  const examples = [
    {
      title: 'Árbol caído en la pista de acceso',
      description:
        'El cliente avisa de un pino caído tras el temporal. Revisar el acceso y valorar la retirada.',
      priority: 'urgente' as const,
      assignedTo: worker.id,
    },
    {
      title: 'Revisar protectores en la parcela norte',
      description:
        'Varios protectores se han soltado. Comprobar cuántos hay que reponer y preparar presupuesto si hace falta.',
      priority: 'normal' as const,
      assignedTo: worker.id,
    },
    {
      title: 'Rama sobre la entrada de la finca',
      description: 'Retirar una rama que dificulta el paso por la cancela.',
      priority: 'alta' as const,
      assignedTo: worker.id,
    },
  ]
  examples.forEach((example, index) => {
    const client = workspace.clients[index % workspace.clients.length]
    if (!client) return
    const date = addDays(today, -3 + index)
    const context = {
      id: () => `inc-demo-${++sequence}`,
      today: date,
      now: `${date}T09:00:00.000Z`,
      actorId: admin.id,
    }
    const created = createServiceIncident(
      next,
      {
        ...example,
        clientId: client.id,
        location: 'Acceso principal de la finca',
        contactName: client.contactName,
        contactPhone: client.phone,
        preferredTime: 'Llamar antes de acudir. Preferencia por la mañana.',
      },
      context,
    )
    next = created.workspace
    const visitContext = { ...context, today, now: `${today}T10:00:00.000Z`, actorId: worker.id }
    if (index > 0)
      next = addIncidentVisit(
        next,
        created.incident.id,
        {
          date: today,
          text:
            index === 1
              ? 'Revisado el perímetro; faltan 12 protectores.'
              : 'Retirada la rama y despejado el acceso.',
          minutes: 45,
          material: index === 1 ? 'Pendiente valorar 12 protectores.' : 'Sin material adicional.',
        },
        visitContext,
      )
    if (index === 2)
      next = closeServiceIncident(
        next,
        created.incident.id,
        'Acceso despejado y comprobado con el cliente.',
        visitContext,
      )
  })
  return next.incidents
}
