import type { IsoDate } from '@/shared/lib/dates'

export type ServiceIncidentStatus = 'abierta' | 'en_curso' | 'cerrada'
export type ServiceIncidentPriority = 'normal' | 'alta' | 'urgente'

export type IncidentEntry = {
  id: string
  kind: 'actuacion' | 'cierre' | 'reapertura' | 'asignacion'
  date: IsoDate
  at: string
  authorId: string
  text: string
  minutes: number
  material: string
}

/** Customer service request, independent of incidents reported in a daily work report. */
export type ServiceIncident = {
  id: string
  code: string
  clientId: string
  title: string
  description: string
  location: string
  contactName: string
  contactPhone: string
  preferredTime: string
  priority: ServiceIncidentPriority
  assignedTo: string | null
  status: ServiceIncidentStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  closedBy: string | null
  closedAt: string | null
  resolution: string
  entries: IncidentEntry[]
}

export type ServiceIncidentInput = Pick<
  ServiceIncident,
  | 'clientId'
  | 'title'
  | 'description'
  | 'location'
  | 'contactName'
  | 'contactPhone'
  | 'preferredTime'
  | 'priority'
  | 'assignedTo'
>

export type IncidentVisitInput = Pick<IncidentEntry, 'date' | 'text' | 'minutes' | 'material'>
