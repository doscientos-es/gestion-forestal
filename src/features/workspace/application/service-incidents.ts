import { DomainError } from '@/shared/lib/errors'

import { saveBudget, type BudgetInput, type Context } from './commands'
import type {
  IncidentEntry,
  IncidentVisitInput,
  ServiceIncident,
  ServiceIncidentInput,
} from './incident-model'
import type { Person, Workspace } from './model'

export function incidentActor(workspace: Workspace, context: Context): Person {
  const actor = workspace.people.find((person) => person.id === context.actorId)
  if (!actor) throw new DomainError('Inicia sesión para gestionar incidencias.')
  return actor
}

export function canManageIncident(incident: ServiceIncident, actor: Person) {
  return (
    actor.role === 'admin' || incident.createdBy === actor.id || incident.assignedTo === actor.id
  )
}

export function visibleIncidents(workspace: Workspace, actor: Person) {
  return workspace.incidents.filter((incident) => canManageIncident(incident, actor))
}

export function requireIncident(workspace: Workspace, incidentId: string, context: Context) {
  const actor = incidentActor(workspace, context)
  const incident = workspace.incidents.find((item) => item.id === incidentId)
  if (!incident || !canManageIncident(incident, actor))
    throw new DomainError('Incidencia no encontrada o sin permiso para gestionarla.')
  return { incident, actor }
}

function cleanText(value: string, label: string, max: number, required = false) {
  const text = value.trim()
  if (required && !text) throw new DomainError(`Completa ${label}.`)
  if (text.length > max) throw new DomainError(`${label}: máximo ${max} caracteres.`)
  return text
}

export function createServiceIncident(
  workspace: Workspace,
  input: ServiceIncidentInput,
  context: Context,
) {
  const actor = incidentActor(workspace, context)
  if (!workspace.clients.some((client) => client.id === input.clientId))
    throw new DomainError('Selecciona un cliente válido.')
  if (!['normal', 'alta', 'urgente'].includes(input.priority))
    throw new DomainError('Selecciona una prioridad válida.')
  const assignedTo = actor.role === 'admin' ? input.assignedTo : actor.id
  if (assignedTo && !workspace.people.some((person) => person.id === assignedTo))
    throw new DomainError('Responsable no encontrado.')
  const prefix = `INC-${context.today.slice(0, 4)}-`
  const sequence =
    workspace.incidents.reduce(
      (max, incident) =>
        incident.code.startsWith(prefix)
          ? Math.max(max, Number(incident.code.slice(prefix.length)) || 0)
          : max,
      0,
    ) + 1
  const incident: ServiceIncident = {
    id: context.id(),
    code: `${prefix}${String(sequence).padStart(3, '0')}`,
    clientId: input.clientId,
    title: cleanText(input.title, 'el asunto', 160, true),
    description: cleanText(input.description, 'la descripción', 4000, true),
    location: cleanText(input.location, 'la ubicación', 300),
    contactName: cleanText(input.contactName, 'el contacto', 160),
    contactPhone: cleanText(input.contactPhone, 'el teléfono', 60),
    preferredTime: cleanText(input.preferredTime, 'la disponibilidad', 300),
    priority: input.priority,
    assignedTo,
    status: 'abierta',
    createdBy: actor.id,
    createdAt: context.now,
    updatedAt: context.now,
    closedBy: null,
    closedAt: null,
    resolution: '',
    entries: [],
  }
  return { workspace: { ...workspace, incidents: [incident, ...workspace.incidents] }, incident }
}

function replaceIncident(workspace: Workspace, incident: ServiceIncident): Workspace {
  return {
    ...workspace,
    incidents: workspace.incidents.map((item) => (item.id === incident.id ? incident : item)),
  }
}

function entry(context: Context, kind: IncidentEntry['kind'], text: string): IncidentEntry {
  if (!context.actorId) throw new DomainError('Inicia sesión para gestionar incidencias.')
  return {
    id: context.id(),
    kind,
    date: context.today,
    at: context.now,
    authorId: context.actorId,
    text,
    minutes: 0,
    material: '',
  }
}

export function addIncidentVisit(
  workspace: Workspace,
  incidentId: string,
  input: IncidentVisitInput,
  context: Context,
) {
  const { incident } = requireIncident(workspace, incidentId, context)
  if (incident.status === 'cerrada')
    throw new DomainError('Reabre la incidencia antes de añadir actuaciones.')
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !Number.isFinite(Date.parse(input.date)) ||
    new Date(input.date).toISOString().slice(0, 10) !== input.date ||
    input.date > context.today ||
    input.date < incident.createdAt.slice(0, 10)
  )
    throw new DomainError('La actuación debe tener una fecha válida entre el aviso y hoy.')
  if (!Number.isInteger(input.minutes) || input.minutes < 0 || input.minutes > 1440)
    throw new DomainError('Indica un tiempo entre 0 y 1440 minutos.')
  const visit: IncidentEntry = {
    ...entry(context, 'actuacion', cleanText(input.text, 'el trabajo realizado', 4000, true)),
    date: input.date,
    minutes: input.minutes,
    material: cleanText(input.material, 'el material empleado', 2000),
  }
  return replaceIncident(workspace, {
    ...incident,
    status: 'en_curso',
    updatedAt: context.now,
    entries: [...incident.entries, visit],
  })
}

export function closeServiceIncident(
  workspace: Workspace,
  incidentId: string,
  resolution: string,
  context: Context,
) {
  const { incident, actor } = requireIncident(workspace, incidentId, context)
  if (incident.status === 'cerrada') throw new DomainError('La incidencia ya está cerrada.')
  const text = cleanText(resolution, 'la solución aplicada', 4000, true)
  return replaceIncident(workspace, {
    ...incident,
    status: 'cerrada',
    resolution: text,
    closedBy: actor.id,
    closedAt: context.now,
    updatedAt: context.now,
    entries: [...incident.entries, entry(context, 'cierre', text)],
  })
}

export function reopenServiceIncident(workspace: Workspace, incidentId: string, context: Context) {
  const { incident } = requireIncident(workspace, incidentId, context)
  if (incident.status !== 'cerrada') throw new DomainError('La incidencia no está cerrada.')
  return replaceIncident(workspace, {
    ...incident,
    status: 'abierta',
    closedBy: null,
    closedAt: null,
    resolution: '',
    updatedAt: context.now,
    entries: [...incident.entries, entry(context, 'reapertura', 'Incidencia reabierta')],
  })
}

export function assignServiceIncident(
  workspace: Workspace,
  incidentId: string,
  assignedTo: string | null,
  context: Context,
) {
  const { incident, actor } = requireIncident(workspace, incidentId, context)
  if (actor.role !== 'admin') throw new DomainError('Solo la oficina puede asignar responsables.')
  if (incident.status === 'cerrada')
    throw new DomainError('Reabre la incidencia antes de reasignarla.')
  const person = workspace.people.find((item) => item.id === assignedTo)
  if (assignedTo && !person) throw new DomainError('Responsable no encontrado.')
  if (incident.assignedTo === assignedTo) return workspace
  return replaceIncident(workspace, {
    ...incident,
    assignedTo,
    updatedAt: context.now,
    entries: [
      ...incident.entries,
      entry(
        context,
        'asignacion',
        person ? `Asignada a ${person.name}` : 'Sin responsable asignado',
      ),
    ],
  })
}

/** Save only after the office reviews the draft. The relation is stored on the budget, never inferred from notes. */
export function budgetFromIncident(
  workspace: Workspace,
  incidentId: string,
  input: BudgetInput,
  context: Context,
) {
  const { incident, actor } = requireIncident(workspace, incidentId, context)
  if (actor.role !== 'admin') throw new DomainError('Solo la oficina puede crear presupuestos.')
  const existing = workspace.budgets.find((budget) => budget.incidentId === incidentId)
  if (existing) return { workspace, budget: existing }
  if (input.clientId !== incident.clientId)
    throw new DomainError('El presupuesto debe pertenecer al cliente de la incidencia.')
  if (!workspace.zones.some((zone) => zone.id === input.zoneId))
    throw new DomainError('Selecciona una zona válida.')
  const saved = saveBudget(workspace, input, context)
  const budget = { ...saved.budget, incidentId }
  return {
    workspace: {
      ...saved.workspace,
      budgets: saved.workspace.budgets.map((item) => (item.id === budget.id ? budget : item)),
    },
    budget,
  }
}
