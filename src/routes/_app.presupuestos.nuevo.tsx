import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { BudgetEditorPage, duplicateDraft, emptyDraft } from '@/features/budgets'
import { useWorkspace } from '@/features/workspace'
import { clock } from '@/shared/lib/clock'

export const Route = createFileRoute('/_app/presupuestos/nuevo')({
  validateSearch: (search: Record<string, unknown>): { desde?: string; cliente?: string } => ({
    ...(typeof search.desde === 'string' ? { desde: search.desde } : {}),
    ...(typeof search.cliente === 'string' ? { cliente: search.cliente } : {}),
  }),
  beforeLoad: ({ context }) => requireArea(context, 'presupuestos'),
  component: NewBudgetRoute,
})

function NewBudgetRoute() {
  const { desde, cliente } = Route.useSearch()
  const workspace = useWorkspace()
  const source = workspace.budgets.find((budget) => budget.id === desde)
  // `cliente` comes from a client's page: the budget starts with that client already chosen.
  const client = workspace.clients.find((item) => item.id === cliente)
  const initial = source
    ? duplicateDraft(source, clock.today())
    : { ...emptyDraft(clock.today(), workspace), clientId: client?.id ?? '' }
  return <BudgetEditorPage key={`${desde ?? 'new'}:${client?.id ?? ''}`} initial={initial} />
}
