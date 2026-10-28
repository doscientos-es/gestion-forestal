import {
  budgetEmailDraft,
  estimateStoredBudget,
  lookup,
  useWorkspace,
  type Budget,
} from '@/features/workspace'
import { useCommand } from '@/shared/lib/use-command'
import { SendEmailDialog } from '@/shared/ui/send-email-dialog'

import { budgetsApi } from '../api'

/** Link the client receives. Opening it counts as a view in the budget's history. */
export function proposalLink(budgetId: string) {
  return `${window.location.origin}/propuesta/${budgetId}`
}

/** Same page for the office to check: it is not recorded as a visit and cannot answer. */
export function proposalPreviewLink(budgetId: string) {
  return `${proposalLink(budgetId)}?previa=1`
}

/** Compose the email that carries a proposal (simulated: it is recorded, never delivered). */
export function SendBudgetDialog({
  budget,
  onClose,
}: {
  budget: Budget | null
  onClose: () => void
}) {
  const workspace = useWorkspace()
  const send = useCommand(
    (email: { to: string; subject: string; message: string }) =>
      budgetsApi.sendEmail(budget?.id ?? '', email),
    {
      success: (_output, email) => ({
        title: 'Propuesta enviada',
        description: `Anotado en el historial · ${email.to}`,
      }),
      onSuccess: onClose,
    },
  )
  const client = budget ? lookup(workspace).client(budget.clientId) : undefined
  const initial = budget
    ? budgetEmailDraft(
      budget,
      client,
      estimateStoredBudget(budget, workspace.species).price,
      proposalLink(budget.id),
    )
    : { to: '', subject: '', message: '' }

  return (
    <SendEmailDialog
      key={budget?.id ?? 'none'}
      open={budget !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Enviar propuesta al cliente"
      description={budget ? `${budget.number} · ${budget.title}` : ''}
      initial={initial}
      attachment={budget ? `Propuesta ${budget.number}.pdf · enlace de consulta` : ''}
      pending={send.isPending}
      confirmLabel={budget?.status === 'enviado' ? 'Reenviar propuesta' : 'Enviar propuesta'}
      onSend={(email) => send.mutate(email)}
    />
  )
}
