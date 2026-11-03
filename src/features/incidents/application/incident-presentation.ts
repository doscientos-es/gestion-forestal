import type { ServiceIncidentPriority, ServiceIncidentStatus } from '@/features/workspace'
import type { Tone } from '@/shared/lib/tone'

export const incidentStatus: Record<ServiceIncidentStatus, { label: string; tone: Tone }> = {
  abierta: { label: 'Abierta', tone: 'amber' },
  en_curso: { label: 'En curso', tone: 'blue' },
  cerrada: { label: 'Cerrada', tone: 'green' },
}

export const incidentPriority: Record<ServiceIncidentPriority, string> = {
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
}
