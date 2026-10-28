import type { IsoDate } from '@/shared/lib/dates'
import { DomainError as CommandError } from '@/shared/lib/errors'

import { logActivity } from './activity'
import { estimateBudget, toPlannedFigures, validateBudget } from './budget-calculation'
import { isValidIban, normalizeIban } from './iban'
import { DEFAULT_VAT_RATE, nextInvoiceReference, proposeDraft } from './invoice-draft'
import type {
  AppNotification,
  WorkTask,
  Absence,
  Assignment,
  Budget,
  BudgetStatus,
  Client,
  DailyReport,
  InvoiceDraft,
  Work,
  Workspace,
  Zone,
} from './model'
import { findConflicts } from './planning'
import { calculatePerformance } from './work-performance'

export { CommandError }

export type BudgetInput = Pick<
  Budget,
  'title' | 'clientId' | 'zoneId' | 'date' | 'lines' | 'params' | 'notes'
>

export type Context = {
  id: () => string
  today: IsoDate
  /** ISO date-time of the command, stamped on activity events. */
  now: string
  /** Signed-in person, or null when unknown (tests, background work). */
  actorId: string | null
}

function nextBudgetNumber(workspace: Workspace, year: number) {
  const prefix = `P-${year}-`
  const max = workspace.budgets
    .filter((budget) => budget.number.startsWith(prefix))
    .reduce((highest, budget) => Math.max(highest, Number(budget.number.slice(prefix.length))), 0)
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

function nextWorkCode(workspace: Workspace, year: number) {
  const prefix = `OB-${String(year).slice(2)}-`
  const count = workspace.works.filter((work) => work.code.startsWith(prefix)).length
  return `${prefix}${String(count + 1).padStart(2, '0')}`
}

export type ClientInput = Pick<Client, 'name' | 'kind' | 'taxId' | 'town'> &
  Partial<Pick<Client, 'email' | 'phone' | 'iban'>>

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Checks the optional contact fields and returns them trimmed (IBAN without spaces). */
export function cleanClientContact(input: ClientInput) {
  const email = input.email?.trim() ?? ''
  const iban = normalizeIban(input.iban ?? '')
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new CommandError('El correo no es válido.')
  if (iban && !isValidIban(iban)) throw new CommandError('El IBAN no es válido.')
  return { email, phone: input.phone?.trim() ?? '', iban }
}

/** Adds a client to the catalogue the budget form picks from. */
export function createClient(
  workspace: Workspace,
  input: ClientInput,
  context: Context,
): { workspace: Workspace; client: Client } {
  const name = input.name.trim()
  if (!name) throw new CommandError('Escribe el nombre del cliente.')
  if (workspace.clients.some((client) => sameName(client.name, name)))
    throw new CommandError('Ya existe un cliente con ese nombre.')
  const client: Client = {
    id: context.id(),
    name,
    kind: input.kind,
    taxId: input.taxId.trim(),
    town: input.town.trim(),
    ...cleanClientContact(input),
  }
  return { workspace: { ...workspace, clients: [client, ...workspace.clients] }, client }
}

/** Adds a zone (monte, comarca…) to the catalogue the budget form picks from. */
export function createZone(
  workspace: Workspace,
  name: string,
  context: Context,
): { workspace: Workspace; zone: Zone } {
  const trimmed = name.trim()
  if (!trimmed) throw new CommandError('Escribe el nombre de la zona.')
  if (workspace.zones.some((zone) => sameName(zone.name, trimmed)))
    throw new CommandError('Ya existe una zona con ese nombre.')
  const zone: Zone = { id: context.id(), name: trimmed }
  return { workspace: { ...workspace, zones: [zone, ...workspace.zones] }, zone }
}

export function saveBudget(
  workspace: Workspace,
  input: BudgetInput,
  context: Context,
  budgetId?: string,
  origin: 'manual' | 'csv' = 'manual',
): { workspace: Workspace; budget: Budget } {
  const issues = validateBudget(input)
  if (issues[0]) throw new CommandError(issues[0].message)
  const existing = workspace.budgets.find((budget) => budget.id === budgetId)
  if (existing && existing.status === 'aceptado')
    throw new CommandError('Un presupuesto aceptado no se puede modificar.')
  const budget: Budget = existing
    ? { ...existing, ...input }
    : {
        ...input,
        id: context.id(),
        number: nextBudgetNumber(workspace, Number(input.date.slice(0, 4))),
        status: 'borrador',
        workId: null,
      }
  const budgets = existing
    ? workspace.budgets.map((item) => (item.id === budget.id ? budget : item))
    : [budget, ...workspace.budgets]
  const saved = { ...workspace, budgets }
  return {
    workspace: existing
      ? saved
      : logActivity(
          saved,
          {
            kind: origin === 'csv' ? 'presupuesto_importado' : 'presupuesto_creado',
            entity: 'budget',
            entityId: budget.id,
            summary: origin === 'csv' ? `${budget.number} · desde CSV` : budget.number,
          },
          context,
        ),
    budget,
  }
}

export function setBudgetStatus(
  workspace: Workspace,
  budgetId: string,
  status: Exclude<BudgetStatus, 'aceptado'>,
  context: Context,
): Workspace {
  const current = workspace.budgets.find((budget) => budget.id === budgetId)
  if (!current || current.status === 'aceptado' || current.status === status) return workspace
  const next = {
    ...workspace,
    budgets: workspace.budgets.map((budget) =>
      budget.id === budgetId ? { ...budget, status } : budget,
    ),
  }
  if (status === 'borrador') return next
  return logActivity(
    next,
    {
      kind: status === 'enviado' ? 'presupuesto_enviado' : 'presupuesto_rechazado',
      entity: 'budget',
      entityId: budgetId,
      summary: status === 'enviado' ? 'Marcado como enviado a mano' : 'Rechazado por el cliente',
    },
    context,
  )
}

/** Accepting freezes the estimate into a work so actuals can be compared later. */
export function acceptBudget(
  workspace: Workspace,
  budgetId: string,
  context: Context,
): { workspace: Workspace; work: Work } {
  const budget = workspace.budgets.find((item) => item.id === budgetId)
  if (!budget) throw new CommandError('Presupuesto no encontrado.')
  if (budget.workId) throw new CommandError('Este presupuesto ya tiene una obra.')
  const estimate = estimateBudget(budget.lines, budget.params, workspace.species)
  const year = Number(context.today.slice(0, 4))
  const work: Work = {
    id: context.id(),
    code: nextWorkCode(workspace, year),
    title: budget.title,
    budgetId: budget.id,
    clientId: budget.clientId,
    zoneId: budget.zoneId,
    speciesIds: [
      ...new Set(
        budget.lines.flatMap((line) => (line.kind === 'plantacion' ? [line.speciesId] : [])),
      ),
    ],
    year,
    status: 'pendiente',
    planned: toPlannedFigures(estimate),
    finishedOn: null,
  }
  return {
    work,
    workspace: logActivity(
      {
        ...workspace,
        works: [work, ...workspace.works],
        budgets: workspace.budgets.map((item) =>
          item.id === budgetId ? { ...item, status: 'aceptado', workId: work.id } : item,
        ),
      },
      {
        kind: 'presupuesto_aceptado',
        entity: 'budget',
        entityId: budgetId,
        summary: `Obra ${work.code} creada`,
      },
      context,
    ),
  }
}

function updateWork(workspace: Workspace, workId: string, patch: Partial<Work>): Workspace {
  return {
    ...workspace,
    works: workspace.works.map((work) => (work.id === workId ? { ...work, ...patch } : work)),
  }
}

export function notify(
  workspace: Workspace,
  personIds: string[],
  notice: Pick<AppNotification, 'kind' | 'title' | 'body' | 'workId'> & { budgetId?: string },
  context: Context,
): Workspace {
  const created: AppNotification[] = personIds.map((personId) => ({
    ...notice,
    budgetId: notice.budgetId ?? null,
    id: context.id(),
    personId,
    createdOn: context.today,
    read: false,
  }))
  return { ...workspace, notifications: [...created, ...workspace.notifications] }
}

function crewPeople(workspace: Workspace, crewId: string) {
  return workspace.people.filter((person) => person.crewId === crewId).map((person) => person.id)
}

export function adminIds(workspace: Workspace) {
  return workspace.people.filter((person) => person.role === 'admin').map((person) => person.id)
}

export type ScheduleInput = Omit<Assignment, 'id'> & { tasks?: string[] }

/** Assigns a work to a crew, notifies its members and creates the checklist the office wrote. */
export function scheduleWork(
  workspace: Workspace,
  input: ScheduleInput,
  context: Context,
): Workspace {
  if (input.end < input.start) throw new CommandError('La fecha de fin es anterior al inicio.')
  const work = workspace.works.find((item) => item.id === input.workId)
  if (!work) throw new CommandError('Obra no encontrada.')
  const { tasks: taskTexts = [], ...range } = input
  const assignment: Assignment = { ...range, id: context.id() }
  const tasks: WorkTask[] = taskTexts
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({
      id: context.id(),
      workId: work.id,
      text,
      createdOn: context.today,
      doneBy: null,
      doneOn: null,
    }))
  let next: Workspace = {
    ...workspace,
    assignments: [...workspace.assignments, assignment],
    tasks: [...workspace.tasks, ...tasks],
  }
  next = notify(
    next,
    crewPeople(workspace, input.crewId),
    {
      kind: 'obra_asignada',
      title: `Nueva obra: ${work.title}`,
      body:
        tasks.length > 0
          ? `Empiezas el ${input.start}. Tienes ${tasks.length} tareas por completar.`
          : `Empiezas el ${input.start}.`,
      workId: work.id,
    },
    context,
  )
  return work.status === 'pendiente' ? updateWork(next, work.id, { status: 'planificada' }) : next
}

export function addTask(
  workspace: Workspace,
  workId: string,
  text: string,
  context: Context,
): Workspace {
  const clean = text.trim()
  if (!clean) throw new CommandError('Escribe qué hay que hacer.')
  const work = workspace.works.find((item) => item.id === workId)
  if (!work) throw new CommandError('Obra no encontrada.')
  const task: WorkTask = {
    id: context.id(),
    workId,
    text: clean,
    createdOn: context.today,
    doneBy: null,
    doneOn: null,
  }
  const crews = [
    ...new Set(
      workspace.assignments.filter((item) => item.workId === workId).map((item) => item.crewId),
    ),
  ]
  const recipients = crews.flatMap((crewId) => crewPeople(workspace, crewId))
  return notify(
    { ...workspace, tasks: [...workspace.tasks, task] },
    recipients,
    { kind: 'tarea_nueva', title: `Tarea nueva en ${work.title}`, body: clean, workId },
    context,
  )
}

export function removeTask(workspace: Workspace, taskId: string): Workspace {
  return { ...workspace, tasks: workspace.tasks.filter((task) => task.id !== taskId) }
}

export function setTaskDone(
  workspace: Workspace,
  taskId: string,
  personId: string,
  done: boolean,
  context: Context,
): Workspace {
  return {
    ...workspace,
    tasks: workspace.tasks.map((task) =>
      task.id === taskId
        ? { ...task, doneBy: done ? personId : null, doneOn: done ? context.today : null }
        : task,
    ),
  }
}

export function markNotificationsRead(
  workspace: Workspace,
  personId: string,
  ids?: string[],
): Workspace {
  return {
    ...workspace,
    notifications: workspace.notifications.map((item) =>
      item.personId === personId && !item.read && (!ids || ids.includes(item.id))
        ? { ...item, read: true }
        : item,
    ),
  }
}

/** Changes dates and/or crew of an assignment; the affected crews are notified. */
export function moveAssignment(
  workspace: Workspace,
  assignmentId: string,
  patch: Pick<Assignment, 'crewId' | 'start' | 'end'>,
  context: Context,
): Workspace {
  if (patch.end < patch.start) throw new CommandError('La fecha de fin es anterior al inicio.')
  const assignment = workspace.assignments.find((item) => item.id === assignmentId)
  if (!assignment) throw new CommandError('Asignación no encontrada.')
  const overlap = findConflicts({ ...patch, id: assignmentId }, workspace.assignments, [], []).some(
    (conflict) => conflict.kind === 'solape',
  )
  if (overlap) throw new CommandError('Esa cuadrilla ya tiene otra obra en esas fechas.')
  const work = workspace.works.find((item) => item.id === assignment.workId)
  const title = work?.title ?? 'la obra'
  let next: Workspace = {
    ...workspace,
    assignments: workspace.assignments.map((item) =>
      item.id === assignmentId ? { ...item, ...patch } : item,
    ),
  }
  const noticeFor = (crewId: string, notice: { title: string; body: string }) => {
    next = notify(
      next,
      crewPeople(workspace, crewId),
      { kind: 'obra_cambiada', workId: assignment.workId, ...notice },
      context,
    )
  }
  if (patch.crewId === assignment.crewId) {
    noticeFor(patch.crewId, {
      title: `Cambio de fechas: ${title}`,
      body: `Ahora va del ${patch.start} al ${patch.end}.`,
    })
  } else {
    noticeFor(assignment.crewId, {
      title: `Obra retirada: ${title}`,
      body: 'Ya no está asignada a tu cuadrilla.',
    })
    noticeFor(patch.crewId, {
      title: `Nueva obra: ${title}`,
      body: `Empiezas el ${patch.start}.`,
    })
  }
  return next
}

export function removeAssignment(
  workspace: Workspace,
  assignmentId: string,
  context: Context,
): Workspace {
  const assignment = workspace.assignments.find((item) => item.id === assignmentId)
  if (!assignment) return workspace
  const assignments = workspace.assignments.filter((item) => item.id !== assignmentId)
  const work = workspace.works.find((item) => item.id === assignment.workId)
  const stillPlanned = assignments.some((item) => item.workId === assignment.workId)
  const next = notify(
    { ...workspace, assignments },
    crewPeople(workspace, assignment.crewId),
    {
      kind: 'obra_cambiada',
      title: `Asignación cancelada: ${work?.title ?? 'obra'}`,
      body: `Ya no tienes esta obra del ${assignment.start} al ${assignment.end}.`,
      workId: assignment.workId,
    },
    context,
  )
  return work?.status === 'planificada' && !stillPlanned
    ? updateWork(next, work.id, { status: 'pendiente' })
    : next
}

export type ReportInput = Omit<DailyReport, 'id'>

export function submitReport(
  workspace: Workspace,
  input: ReportInput,
  context: Context,
): Workspace {
  if (input.workerIds.length === 0) throw new CommandError('Marca al menos un trabajador.')
  if (input.plants < 0 || input.hectares < 0) throw new CommandError('Valores no válidos.')
  const work = workspace.works.find((item) => item.id === input.workId)
  if (!work) throw new CommandError('Obra no encontrada.')
  if (work.status === 'terminada' || work.status === 'facturada')
    throw new CommandError('La obra ya está terminada.')
  const duplicate = workspace.reports.find(
    (report) =>
      report.workId === input.workId &&
      report.crewId === input.crewId &&
      report.date === input.date,
  )
  const report: DailyReport = { ...input, id: duplicate?.id ?? context.id() }
  const reports = duplicate
    ? workspace.reports.map((item) => (item.id === duplicate.id ? report : item))
    : [...workspace.reports, report]
  return updateWork({ ...workspace, reports }, work.id, { status: 'en_curso' })
}

export function finishWork(workspace: Workspace, workId: string, context: Context): Workspace {
  return updateWork(workspace, workId, { status: 'terminada', finishedOn: context.today })
}

export function requestAbsence(
  workspace: Workspace,
  input: Pick<Absence, 'personId' | 'type' | 'start' | 'end' | 'note'>,
  context: Context,
  approved = false,
): Workspace {
  if (input.end < input.start) throw new CommandError('La fecha de fin es anterior al inicio.')
  const absence: Absence = {
    ...input,
    id: context.id(),
    status: approved ? 'aprobada' : 'solicitada',
    requestedOn: context.today,
  }
  const next = { ...workspace, absences: [absence, ...workspace.absences] }
  if (approved) return next
  const person = workspace.people.find((item) => item.id === input.personId)
  return notify(
    next,
    adminIds(workspace),
    {
      kind: 'ausencia_solicitada',
      title: `${person?.name ?? 'Un trabajador'} pide ${input.type}`,
      body: `Del ${input.start} al ${input.end}.`,
      workId: null,
    },
    context,
  )
}

export function decideAbsence(
  workspace: Workspace,
  absenceId: string,
  status: 'aprobada' | 'rechazada',
  context: Context,
): Workspace {
  const absence = workspace.absences.find((item) => item.id === absenceId)
  const next = {
    ...workspace,
    absences: workspace.absences.map((item) =>
      item.id === absenceId ? { ...item, status } : item,
    ),
  }
  if (!absence) return next
  return notify(
    next,
    [absence.personId],
    {
      kind: 'ausencia_resuelta',
      title: status === 'aprobada' ? 'Tus días están aprobados' : 'Tu solicitud no se ha aprobado',
      body: `Del ${absence.start} al ${absence.end}.`,
      workId: null,
    },
    context,
  )
}

/** Removes an absence registered by mistake (or no longer needed) and tells the person. */
export function cancelAbsence(
  workspace: Workspace,
  absenceId: string,
  context: Context,
): Workspace {
  const absence = workspace.absences.find((item) => item.id === absenceId)
  if (!absence) throw new CommandError('Ausencia no encontrada.')
  return notify(
    { ...workspace, absences: workspace.absences.filter((item) => item.id !== absenceId) },
    [absence.personId],
    {
      kind: 'ausencia_resuelta',
      title: 'Se ha anulado una ausencia tuya',
      body: `Del ${absence.start} al ${absence.end}.`,
      workId: null,
    },
    context,
  )
}

export function createInvoiceDraft(
  workspace: Workspace,
  workId: string,
  context: Context,
): { workspace: Workspace; invoice: InvoiceDraft } {
  const work = workspace.works.find((item) => item.id === workId)
  if (!work) throw new CommandError('Obra no encontrada.')
  const performance = calculatePerformance(work, workspace.reports, workspace.people)
  const proposal = proposeDraft(work, performance, workspace.invoices)
  if (!proposal) throw new CommandError('No hay avance pendiente de facturar.')
  const invoice: InvoiceDraft = {
    id: context.id(),
    reference: nextInvoiceReference(Number(context.today.slice(0, 4)), workspace.invoices),
    workId,
    clientId: work.clientId,
    kind: proposal.kind,
    date: context.today,
    progressTo: proposal.progressTo,
    lines: proposal.lines,
    vatRate: DEFAULT_VAT_RATE,
    status: 'borrador',
    sentOn: null,
    paidOn: null,
  }
  const next = logActivity(
    { ...workspace, invoices: [invoice, ...workspace.invoices] },
    { kind: 'factura_creada', entity: 'invoice', entityId: invoice.id, summary: invoice.reference },
    context,
  )
  return {
    invoice,
    workspace: proposal.kind === 'final' ? updateWork(next, workId, { status: 'facturada' }) : next,
  }
}

export function setInvoiceStatus(
  workspace: Workspace,
  invoiceIds: string[],
  status: 'enviada' | 'cobrada',
  context: Context,
): Workspace {
  const changed = workspace.invoices.filter(
    (invoice) => invoiceIds.includes(invoice.id) && invoice.status !== status,
  )
  const next = {
    ...workspace,
    invoices: workspace.invoices.map((invoice) => {
      if (!invoiceIds.includes(invoice.id)) return invoice
      return status === 'enviada'
        ? { ...invoice, status, sentOn: invoice.sentOn ?? context.today }
        : { ...invoice, status, sentOn: invoice.sentOn ?? context.today, paidOn: context.today }
    }),
  }
  return logActivity(
    next,
    changed.map((invoice) => ({
      kind:
        status === 'enviada' ? ('factura_enviada_gestoria' as const) : ('factura_cobrada' as const),
      entity: 'invoice' as const,
      entityId: invoice.id,
      summary: invoice.reference,
    })),
    context,
  )
}
