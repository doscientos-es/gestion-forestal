import { Button, CopyButton } from '@doscientos/ui'
import { Copy, ExternalLink, Printer } from 'lucide-react'

import type { Budget, Workspace } from '@/features/workspace'

import { BudgetDocument } from './budget-document'
import { proposalLink } from './send-budget-dialog'

/** The document the client receives, with the actions the office needs around it. */
export function BudgetProposalTab({ budget, workspace }: { budget: Budget; workspace: Workspace }) {
  const link = proposalLink(budget.id)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          Así lo ve el cliente: sin costes ni margen. Abrir el enlace cuenta como una visita.
        </p>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={link} variant="outline" size="sm" copiedLabel="Enlace copiado">
            <Copy aria-hidden="true" className="size-4" /> Copiar enlace
          </CopyButton>
          <Button
            variant="outline"
            size="sm"
            onPress={() => window.open(link, '_blank', 'noopener')}
          >
            <ExternalLink aria-hidden="true" className="size-4" /> Abrir como cliente
          </Button>
          <Button variant="outline" size="sm" onPress={() => window.print()}>
            <Printer aria-hidden="true" className="size-4" /> Imprimir o guardar PDF
          </Button>
        </div>
      </div>
      <BudgetDocument budget={budget} workspace={workspace} />
    </div>
  )
}
