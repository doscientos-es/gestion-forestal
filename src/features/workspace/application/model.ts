import type { IsoDate } from '@/shared/lib/dates'

/** All amounts are integer cents (EUR). */
export type Cents = number

export type ClientKind = 'ayuntamiento' | 'diputacion' | 'particular' | 'empresa' | 'comunidad'

export type Client = {
  id: string
  name: string
  kind: ClientKind
  taxId: string
  town: string
  /** Where proposals and invoice copies are sent. Empty when unknown. */
  email: string
}

export type Zone = { id: string; name: string }

export type SpeciesKind = 'conifera' | 'frondosa' | 'arbusto'

export type Species = {
  id: string
  name: string
  kind: SpeciesKind
  /** Plant + protector, per unit. */
  unitCost: Cents
}

export type Role = 'admin' | 'capataz' | 'peon'

export type Person = {
  id: string
  name: string
  initials: string
  role: Role
  title: string
  email: string
  crewId: string | null
  /** Cost of one working day (peonada) including social security. */
  dailyCost: Cents
}

export type Crew = {
  id: string
  name: string
  foremanId: string
  tone: 'green' | 'blue' | 'amber'
}

export type PlantingLine = {
  id: string
  kind: 'plantacion'
  speciesId: string
  hectares: number
  /** Plants per hectare. */
  density: number
  /** Plants per worker and day. */
  yieldPerDay: number
}

export type TreatmentLine = {
  id: string
  kind: 'tratamiento'
  description: string
  hectares: number
  /** Hectares per worker and day. */
  hectaresPerDay: number
}

export type BudgetLine = PlantingLine | TreatmentLine

export type BudgetParams = {
  crewSize: number
  dailyCost: Cents
  /** Travel and vehicle cost per crew day. */
  travelPerCrewDay: Cents
  /** Target margin over sale price, 0–0.6. */
  targetMargin: number
}

export type BudgetStatus = 'borrador' | 'enviado' | 'aceptado' | 'rechazado'

export type Budget = {
  id: string
  number: string
  title: string
  clientId: string
  zoneId: string
  date: IsoDate
  status: BudgetStatus
  lines: BudgetLine[]
  params: BudgetParams
  notes: string
  workId: string | null
}

/** Frozen copy of the accepted budget used to compare against actuals. */
export type PlannedFigures = {
  plants: number
  hectares: number
  workerDays: number
  crewDays: number
  crewSize: number
  laborCost: Cents
  materialCost: Cents
  travelCost: Cents
  totalCost: Cents
  price: Cents
  dailyCost: Cents
  travelPerCrewDay: Cents
  /** Weighted material cost per plant, used to cost actual progress. */
  unitMaterialCost: Cents
}

export type WorkStatus = 'pendiente' | 'planificada' | 'en_curso' | 'terminada' | 'facturada'

export type Work = {
  id: string
  code: string
  title: string
  budgetId: string
  clientId: string
  zoneId: string
  speciesIds: string[]
  year: number
  status: WorkStatus
  planned: PlannedFigures
  finishedOn: IsoDate | null
}

export type Assignment = {
  id: string
  workId: string
  crewId: string
  start: IsoDate
  end: IsoDate
}

export type Incident = 'ninguna' | 'lluvia' | 'averia' | 'terreno' | 'planta'

export type DailyReport = {
  id: string
  workId: string
  crewId: string
  date: IsoDate
  workerIds: string[]
  plants: number
  hectares: number
  incident: Incident
  notes: string
  authorId: string
}

export type AbsenceType = 'vacaciones' | 'baja' | 'permiso'
export type AbsenceStatus = 'solicitada' | 'aprobada' | 'rechazada'

export type Absence = {
  id: string
  personId: string
  type: AbsenceType
  start: IsoDate
  end: IsoDate
  status: AbsenceStatus
  note: string
  requestedOn: IsoDate
}

export type InvoiceKind = 'avance' | 'final'
export type InvoiceStatus = 'borrador' | 'enviada' | 'cobrada'

export type InvoiceLine = {
  description: string
  quantity: number
  unit: string
  unitPrice: Cents
}

/** Draft only: the accounting office issues the fiscal invoice. */
export type InvoiceDraft = {
  id: string
  reference: string
  workId: string
  clientId: string
  kind: InvoiceKind
  date: IsoDate
  /** Cumulative progress covered after this draft (0–1). */
  progressTo: number
  lines: InvoiceLine[]
  vatRate: number
  status: InvoiceStatus
  sentOn: IsoDate | null
  paidOn: IsoDate | null
}

/** Checklist item the office asks the crew to complete on a work. */
export type WorkTask = {
  id: string
  workId: string
  text: string
  createdOn: IsoDate
  doneBy: string | null
  doneOn: IsoDate | null
}

export type NotificationKind =
  | 'obra_asignada'
  | 'obra_cambiada'
  | 'gasto_pendiente'
  | 'gasto_revisado'
  | 'tarea_nueva'
  | 'ausencia_solicitada'
  | 'ausencia_resuelta'

/** In-app notice. Push delivery is a production adapter; the demo only stores these. */
export type AppNotification = {
  id: string
  personId: string
  kind: NotificationKind
  title: string
  body: string
  workId: string | null
  createdOn: IsoDate
  read: boolean
}

export type ExpenseCategory =
  | 'combustible'
  | 'herramienta'
  | 'material'
  | 'alquiler'
  | 'alojamiento'
  | 'comida'
  | 'peaje'
  | 'otros'

export type ExpenseStatus = 'pendiente' | 'aprobado' | 'rechazado'

/** A file kept with the record. The demo stores a small data URL; production uses Storage. */
export type Attachment = { name: string; mime: string; dataUrl: string }

/**
 * Money spent for the company (fuel, tools, meals…). The crew registers it on the spot with a photo
 * of the receipt; the office approves it and attaches the formal invoice when it arrives.
 */
export type Expense = {
  id: string
  date: IsoDate
  /** Work it belongs to, or null for general company expenses. */
  workId: string | null
  category: ExpenseCategory
  description: string
  /** Total paid, VAT included. */
  amount: Cents
  /** Who registered it. */
  createdBy: string
  /** Company card/cash, or advanced by the person (who must then be reimbursed). */
  paidWith: 'empresa' | 'propio'
  status: ExpenseStatus
  reviewedBy: string | null
  reviewedOn: IsoDate | null
  rejectReason: string
  /** Photo of the receipt taken by whoever paid. */
  receipt: Attachment | null
  /** Formal invoice, attached by the office. */
  invoice: Attachment | null
  invoiceNumber: string
  reimbursedOn: IsoDate | null
}

export type ActivityKind =
  | 'presupuesto_creado'
  | 'presupuesto_importado'
  | 'presupuesto_enviado'
  | 'presupuesto_visto'
  | 'presupuesto_aceptado'
  | 'presupuesto_rechazado'
  | 'factura_creada'
  | 'factura_enviada_cliente'
  | 'factura_enviada_gestoria'
  | 'factura_cobrada'

export type ActivityEntity = 'budget' | 'invoice'

/**
 * Audit trail of what happened to proposals and invoices: who sent what to whom and how many
 * times the client opened it. Emails are simulated in the demo; production writes the same events.
 */
export type ActivityEvent = {
  id: string
  /** ISO date-time (UTC). */
  at: string
  kind: ActivityKind
  entity: ActivityEntity
  entityId: string
  /** Person who did it; null when the client or the system did. */
  actorId: string | null
  /** One line of detail, e.g. the recipient address. */
  summary: string
}

export type Workspace = {
  version: 1
  /** Monday the synthetic data is anchored to. */
  anchor: IsoDate
  clients: Client[]
  zones: Zone[]
  species: Species[]
  people: Person[]
  crews: Crew[]
  budgets: Budget[]
  works: Work[]
  assignments: Assignment[]
  reports: DailyReport[]
  absences: Absence[]
  invoices: InvoiceDraft[]
  tasks: WorkTask[]
  notifications: AppNotification[]
  expenses: Expense[]
  /** Newest first. */
  activity: ActivityEvent[]
}
