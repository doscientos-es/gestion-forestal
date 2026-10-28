import { Button } from '@doscientos/ui'
import { Printer } from 'lucide-react'

import {
  budgetTracking,
  lookup,
  whatsappLink,
  type Budget,
  type Workspace,
} from '@/features/workspace'
import { ShareLinkCard } from '@/shared/ui/share-link-card'

import { BudgetDocument } from './budget-document'
import { proposalLink, proposalPreviewLink } from './send-budget-dialog'

/** The document the client receives, with the link actions the office needs around it. */
export function BudgetProposalTab({
  budget,
  workspace,
  onSend,
}: {
  budget: Budget
  workspace: Workspace
  onSend: () => void
}) {
  const link = proposalLink(budget.id)
  const tracking = budgetTracking(workspace.activity, budget.id)
  const client = lookup(workspace).client(budget.clientId)
  return (
    <div className="space-y-4">
      <ShareLinkCard
        description={`${budget.number} · lo que recibe el cliente al abrir el enlace`}
        state={{
          sent: tracking.sentAt ? { at: tracking.sentAt, to: tracking.sentTo } : null,
          views: tracking.views,
          lastViewAt: tracking.lastViewAt,
        }}
        link={link}
        previewLink={proposalPreviewLink(budget.id)}
        sendLabel={budget.status === 'enviado' ? 'Reenviar por correo' : 'Enviar por correo'}
        onSend={onSend}
        whatsapp={
          client
            ? whatsappLink(
              client.phone,
              `Hola, le enviamos la propuesta «${budget.title}» (${budget.number}): ${link}`,
            )
            : null
        }
      />
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onPress={() => window.print()}>
          <Printer aria-hidden="true" className="size-4" /> Imprimir o guardar PDF
        </Button>
      </div>
      <BudgetDocument budget={budget} workspace={workspace} />
    </div>
  )
}
