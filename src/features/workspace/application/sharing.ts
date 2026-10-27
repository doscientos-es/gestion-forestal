import { logActivity } from './activity'
import {
  CommandError,
  acceptBudget,
  adminIds,
  notify,
  setBudgetStatus,
  type Context,
} from './commands'
import type { Work, Workspace } from './model'

/**
 * Sending documents. The demo never delivers anything: these commands only record what a real
 * mail adapter would have sent, so the office can see the follow-up flow end to end.
 */
export type EmailInput = { to: string; subject: string; message: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(value: string) {
  return EMAIL.test(value.trim())
}

function validateEmail(input: EmailInput) {
  if (!isEmail(input.to)) throw new CommandError('Escribe un correo de destino válido.')
  if (!input.subject.trim()) throw new CommandError('Escribe el asunto del correo.')
}

/** Records the send; a draft budget becomes «enviado» the first time it leaves the office. */
export function sendBudgetEmail(
  workspace: Workspace,
  budgetId: string,
  input: EmailInput,
  context: Context,
): Workspace {
  const budget = workspace.budgets.find((item) => item.id === budgetId)
  if (!budget) throw new CommandError('Presupuesto no encontrado.')
  if (budget.status === 'aceptado' || budget.status === 'rechazado')
    throw new CommandError('Este presupuesto ya tiene respuesta del cliente.')
  validateEmail(input)
  const next: Workspace =
    budget.status === 'borrador'
      ? {
          ...workspace,
          budgets: workspace.budgets.map((item) =>
            item.id === budgetId ? { ...item, status: 'enviado' } : item,
          ),
        }
      : workspace
  return logActivity(
    next,
    { kind: 'presupuesto_enviado', entity: 'budget', entityId: budgetId, summary: input.to.trim() },
    context,
  )
}

/** The client opened the proposal link. Unknown budgets are ignored: the link is public. */
export function recordBudgetView(
  workspace: Workspace,
  budgetId: string,
  context: Context,
): Workspace {
  if (!workspace.budgets.some((item) => item.id === budgetId)) return workspace
  return logActivity(
    workspace,
    {
      kind: 'presupuesto_visto',
      entity: 'budget',
      entityId: budgetId,
      summary: 'Enlace de la propuesta',
      actorId: null,
    },
    context,
  )
}

/**
 * The client answers from the public link. Only a proposal that was sent can be answered, the
 * action is attributed to the client (no signed-in person) and the office gets a notice.
 */
export function respondToBudget(
  workspace: Workspace,
  budgetId: string,
  decision: 'aceptado' | 'rechazado',
  context: Context,
): { workspace: Workspace; work: Work | null } {
  const budget = workspace.budgets.find((item) => item.id === budgetId)
  if (!budget) throw new CommandError('Propuesta no encontrada.')
  if (budget.status !== 'enviado')
    throw new CommandError('Esta propuesta ya no admite respuesta desde el enlace.')
  const client = { ...context, actorId: null }
  let next = workspace
  let work: Work | null = null
  if (decision === 'aceptado') {
    const accepted = acceptBudget(workspace, budgetId, client)
    next = accepted.workspace
    work = accepted.work
  } else next = setBudgetStatus(workspace, budgetId, 'rechazado', client)
  const clientName = workspace.clients.find((item) => item.id === budget.clientId)?.name
  next = notify(
    next,
    adminIds(workspace),
    {
      kind: 'presupuesto_respondido',
      title:
        decision === 'aceptado'
          ? `${clientName ?? 'El cliente'} ha aceptado la propuesta`
          : `${clientName ?? 'El cliente'} ha rechazado la propuesta`,
      body: `${budget.number} · ${budget.title}`,
      workId: work?.id ?? null,
    },
    context,
  )
  return { workspace: next, work }
}

export function sendInvoiceEmail(
  workspace: Workspace,
  invoiceId: string,
  input: EmailInput,
  context: Context,
): Workspace {
  const invoice = workspace.invoices.find((item) => item.id === invoiceId)
  if (!invoice) throw new CommandError('Factura no encontrada.')
  validateEmail(input)
  return logActivity(
    workspace,
    {
      kind: 'factura_enviada_cliente',
      entity: 'invoice',
      entityId: invoiceId,
      summary: input.to.trim(),
    },
    context,
  )
}
