import type { Tone } from '@/shared/lib/tone'

import type {
  AbsenceStatus,
  AbsenceType,
  BudgetStatus,
  ClientKind,
  ExpenseCategory,
  ExpenseStatus,
  Incident,
  InvoiceStatus,
  SpeciesKind,
  Workspace,
  WorkStatus,
} from './model'

export type { Tone }

export const workStatus: Record<WorkStatus, { label: string; tone: Tone }> = {
  pendiente: { label: 'Sin planificar', tone: 'amber' },
  planificada: { label: 'Planificada', tone: 'blue' },
  en_curso: { label: 'En curso', tone: 'green' },
  terminada: { label: 'Terminada', tone: 'purple' },
  facturada: { label: 'Facturada', tone: 'gray' },
}

export const budgetStatus: Record<BudgetStatus, { label: string; tone: Tone }> = {
  borrador: { label: 'Borrador', tone: 'gray' },
  enviado: { label: 'Enviado', tone: 'blue' },
  aceptado: { label: 'Aceptado', tone: 'green' },
  rechazado: { label: 'Rechazado', tone: 'red' },
}

export const invoiceStatus: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  borrador: { label: 'Borrador', tone: 'amber' },
  enviada: { label: 'En gestoría', tone: 'blue' },
  cobrada: { label: 'Cobrada', tone: 'green' },
}

export const absenceStatus: Record<AbsenceStatus, { label: string; tone: Tone }> = {
  solicitada: { label: 'Pendiente', tone: 'amber' },
  aprobada: { label: 'Aprobada', tone: 'green' },
  rechazada: { label: 'Rechazada', tone: 'red' },
}

export const expenseCategory: Record<ExpenseCategory, string> = {
  combustible: 'Combustible',
  herramienta: 'Herramienta',
  material: 'Material',
  alquiler: 'Alquiler de maquinaria',
  alojamiento: 'Alojamiento',
  comida: 'Comidas',
  peaje: 'Peajes y aparcamiento',
  otros: 'Otros',
}

/** Categories where a formal invoice (not just a receipt) is expected for the books. */
export const invoiceExpected: ExpenseCategory[] = [
  'herramienta',
  'material',
  'alquiler',
  'alojamiento',
]

export const expenseStatus: Record<ExpenseStatus, { label: string; tone: Tone }> = {
  pendiente: { label: 'Por revisar', tone: 'amber' },
  aprobado: { label: 'Aprobado', tone: 'green' },
  rechazado: { label: 'Rechazado', tone: 'red' },
}

export const absenceType: Record<AbsenceType, string> = {
  vacaciones: 'Vacaciones',
  baja: 'Baja médica',
  permiso: 'Permiso',
}

export const incidentLabels: Record<Incident, string> = {
  ninguna: 'Sin incidencias',
  lluvia: 'Lluvia',
  averia: 'Avería',
  terreno: 'Terreno difícil',
  planta: 'Falta de planta',
}

export const clientKind: Record<ClientKind, string> = {
  ayuntamiento: 'Ayuntamiento',
  diputacion: 'Administración',
  particular: 'Particular',
  empresa: 'Empresa',
  comunidad: 'Comunidad / asociación',
}

export const speciesKind: Record<SpeciesKind, string> = {
  conifera: 'Conífera',
  frondosa: 'Frondosa',
  arbusto: 'Arbusto',
}

const zoneTones: Tone[] = ['green', 'teal', 'amber', 'purple', 'blue']

export function zoneTone(zoneId: string, workspace: Workspace): Tone {
  const index = workspace.zones.findIndex((zone) => zone.id === zoneId)
  return zoneTones[index % zoneTones.length] ?? 'gray'
}

/** Resolvers the accounting CSV needs (client name and tax ID, work title). */
export function accountingLookup(workspace: Workspace) {
  return {
    client: (id: string) => {
      const client = workspace.clients.find((item) => item.id === id)
      return { name: client?.name ?? id, taxId: client?.taxId ?? '' }
    },
    work: (id: string) => workspace.works.find((item) => item.id === id)?.title ?? id,
  }
}

export function lookup(workspace: Workspace) {
  return {
    client: (id: string) => workspace.clients.find((item) => item.id === id),
    zone: (id: string) => workspace.zones.find((item) => item.id === id),
    species: (id: string) => workspace.species.find((item) => item.id === id),
    person: (id: string) => workspace.people.find((item) => item.id === id),
    crew: (id: string) => workspace.crews.find((item) => item.id === id),
    work: (id: string) => workspace.works.find((item) => item.id === id),
    budget: (id: string) => workspace.budgets.find((item) => item.id === id),
  }
}
