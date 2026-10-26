import { DomainError as CommandError } from '@/shared/lib/errors'

import { adminIds, notify, type Context } from './commands'
import { invoiceExpected } from './labels'
import type { Attachment, Cents, Expense, Person, Workspace } from './model'

export type ExpenseInput = Pick<
  Expense,
  'date' | 'workId' | 'category' | 'description' | 'amount' | 'paidWith' | 'receipt'
>

const formatCents = (value: Cents) => `${(value / 100).toFixed(2).replace('.', ',')} €`

/** Works a person can charge expenses to: all of them for the office, their crew's for a foreman. */
export function expenseWorks(workspace: Workspace, actor: Person) {
  if (actor.role === 'admin') return workspace.works
  const mine = new Set(
    workspace.assignments.filter((item) => item.crewId === actor.crewId).map((item) => item.workId),
  )
  return workspace.works.filter((work) => mine.has(work.id))
}

/** The office sees everything; a foreman only what they registered. */
export function visibleExpenses(workspace: Workspace, actor: Person) {
  return actor.role === 'admin'
    ? workspace.expenses
    : workspace.expenses.filter((expense) => expense.createdBy === actor.id)
}

export const missingInvoice = (expense: Expense) =>
  expense.status === 'aprobado' &&
  invoiceExpected.includes(expense.category) &&
  !expense.invoice &&
  !expense.invoiceNumber

export const needsReimbursement = (expense: Expense) =>
  expense.status === 'aprobado' && expense.paidWith === 'propio' && !expense.reimbursedOn

const sum = (items: Expense[]) => items.reduce((total, item) => total + item.amount, 0)

export function expenseTotals(expenses: Expense[]) {
  const pending = expenses.filter((item) => item.status === 'pendiente')
  const approved = expenses.filter((item) => item.status === 'aprobado')
  return {
    pending: { count: pending.length, amount: sum(pending) },
    approved: { count: approved.length, amount: sum(approved) },
    reimburse: {
      count: approved.filter(needsReimbursement).length,
      amount: sum(approved.filter(needsReimbursement)),
    },
    noInvoice: approved.filter(missingInvoice).length,
  }
}

function validate(workspace: Workspace, input: ExpenseInput, actor: Person, context: Context) {
  if (actor.role === 'peon') throw new CommandError('Tu perfil no puede registrar gastos.')
  if (!input.description.trim()) throw new CommandError('Describe qué se ha pagado.')
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    throw new CommandError('El importe debe ser mayor que cero.')
  if (input.date > context.today) throw new CommandError('La fecha no puede ser futura.')
  if (input.workId === null) {
    if (actor.role !== 'admin') throw new CommandError('Elige la obra a la que se carga el gasto.')
    return
  }
  const allowed = expenseWorks(workspace, actor).some((work) => work.id === input.workId)
  if (!allowed) throw new CommandError('Esa obra no es de tu cuadrilla.')
}

function replace(workspace: Workspace, expense: Expense): Workspace {
  return {
    ...workspace,
    expenses: workspace.expenses.map((item) => (item.id === expense.id ? expense : item)),
  }
}

function find(workspace: Workspace, id: string) {
  const expense = workspace.expenses.find((item) => item.id === id)
  if (!expense) throw new CommandError('Gasto no encontrado.')
  return expense
}

function notifyOffice(workspace: Workspace, expense: Expense, actor: Person, context: Context) {
  return notify(
    workspace,
    adminIds(workspace),
    {
      kind: 'gasto_pendiente',
      title: `Gasto por revisar: ${expense.description}`,
      body: `${actor.name} · ${formatCents(expense.amount)}${expense.receipt ? '' : ' · sin foto del ticket'}.`,
      workId: expense.workId,
    },
    context,
  )
}

export function createExpense(
  workspace: Workspace,
  input: ExpenseInput,
  actor: Person,
  context: Context,
): { workspace: Workspace; expense: Expense } {
  validate(workspace, input, actor, context)
  const office = actor.role === 'admin'
  const expense: Expense = {
    ...input,
    description: input.description.trim(),
    id: context.id(),
    createdBy: actor.id,
    status: office ? 'aprobado' : 'pendiente',
    reviewedBy: office ? actor.id : null,
    reviewedOn: office ? context.today : null,
    rejectReason: '',
    invoice: null,
    invoiceNumber: '',
    reimbursedOn: null,
  }
  const next: Workspace = { ...workspace, expenses: [expense, ...workspace.expenses] }
  return { workspace: office ? next : notifyOffice(next, expense, actor, context), expense }
}

export function updateExpense(
  workspace: Workspace,
  expenseId: string,
  input: ExpenseInput,
  actor: Person,
  context: Context,
): Workspace {
  const current = find(workspace, expenseId)
  const office = actor.role === 'admin'
  if (!office && (current.createdBy !== actor.id || current.status === 'aprobado'))
    throw new CommandError('Un gasto aprobado solo lo puede modificar la oficina.')
  validate(workspace, input, actor, context)
  const resubmit = !office && current.status === 'rechazado'
  const expense: Expense = {
    ...current,
    ...input,
    description: input.description.trim(),
    status: resubmit ? 'pendiente' : current.status,
    rejectReason: resubmit ? '' : current.rejectReason,
    reviewedBy: resubmit ? null : current.reviewedBy,
    reviewedOn: resubmit ? null : current.reviewedOn,
  }
  const next = replace(workspace, expense)
  return resubmit ? notifyOffice(next, expense, actor, context) : next
}

export type ExpenseDecision = { approve: true } | { approve: false; reason: string }

export function reviewExpense(
  workspace: Workspace,
  expenseId: string,
  decision: ExpenseDecision,
  actor: Person,
  context: Context,
): Workspace {
  if (actor.role !== 'admin') throw new CommandError('Solo la oficina revisa los gastos.')
  const current = find(workspace, expenseId)
  if (!decision.approve && !decision.reason.trim())
    throw new CommandError('Explica por qué se rechaza para que puedan corregirlo.')
  const expense: Expense = {
    ...current,
    status: decision.approve ? 'aprobado' : 'rechazado',
    rejectReason: decision.approve ? '' : decision.reason.trim(),
    reviewedBy: actor.id,
    reviewedOn: context.today,
  }
  const next = replace(workspace, expense)
  if (current.createdBy === actor.id) return next
  return notify(
    next,
    [current.createdBy],
    {
      kind: 'gasto_revisado',
      title: decision.approve ? 'Gasto aprobado' : 'Gasto rechazado',
      body: decision.approve
        ? `${current.description} · ${formatCents(current.amount)}.`
        : `${current.description}: ${expense.rejectReason}`,
      workId: current.workId,
    },
    context,
  )
}

export function attachInvoice(
  workspace: Workspace,
  expenseId: string,
  invoice: { number: string; file: Attachment | null },
  actor: Person,
): Workspace {
  if (actor.role !== 'admin') throw new CommandError('Solo la oficina adjunta facturas.')
  const current = find(workspace, expenseId)
  if (!invoice.number.trim() && !invoice.file)
    throw new CommandError('Indica el número de factura o adjunta el archivo.')
  return replace(workspace, {
    ...current,
    invoiceNumber: invoice.number.trim(),
    invoice: invoice.file ?? current.invoice,
  })
}

export function markReimbursed(
  workspace: Workspace,
  expenseId: string,
  actor: Person,
  context: Context,
): Workspace {
  if (actor.role !== 'admin') throw new CommandError('Solo la oficina reembolsa gastos.')
  const current = find(workspace, expenseId)
  if (!needsReimbursement(current))
    throw new CommandError('Este gasto no tiene nada que reembolsar.')
  const next = replace(workspace, { ...current, reimbursedOn: context.today })
  return notify(
    next,
    [current.createdBy],
    {
      kind: 'gasto_revisado',
      title: 'Gasto reembolsado',
      body: `${current.description} · ${formatCents(current.amount)}.`,
      workId: current.workId,
    },
    context,
  )
}

export function removeExpense(workspace: Workspace, expenseId: string, actor: Person): Workspace {
  const current = find(workspace, expenseId)
  const own = current.createdBy === actor.id && current.status !== 'aprobado'
  if (actor.role !== 'admin' && !own)
    throw new CommandError('Solo se pueden borrar tus gastos que aún no están aprobados.')
  return { ...workspace, expenses: workspace.expenses.filter((item) => item.id !== expenseId) }
}
