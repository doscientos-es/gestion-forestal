import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { BudgetEditorPage, duplicateDraft, emptyDraft } from '@/features/budgets'
import { useWorkspace } from '@/features/workspace'
import { clock } from '@/shared/lib/clock'

export const Route = createFileRoute('/_app/presupuestos/nuevo')({
  validateSearch: (search: Record<string, unknown>): { desde?: string } =>
    typeof search.desde === 'string' ? { desde: search.desde } : {},
  beforeLoad: ({ context }) => requireArea(context, 'presupuestos'),
  component: NewBudgetRoute,
})

function NewBudgetRoute() {
  const { desde } = Route.useSearch()
  const source = useWorkspace().budgets.find((budget) => budget.id === desde)
  const initial = source ? duplicateDraft(source, clock.today()) : emptyDraft(clock.today())
  return <BudgetEditorPage key={desde ?? 'new'} initial={initial} />
}
