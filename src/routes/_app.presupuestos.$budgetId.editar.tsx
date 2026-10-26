import { createFileRoute, notFound, redirect } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { BudgetEditorPage, draftFromBudget } from '@/features/budgets'
import { useWorkspace } from '@/features/workspace'

export const Route = createFileRoute('/_app/presupuestos/$budgetId/editar')({
  beforeLoad: async ({ context, params }) => {
    const { workspace } = await requireArea(context, 'presupuestos')
    const budget = workspace.budgets.find((item) => item.id === params.budgetId)
    if (!budget) throw notFound()
    if (budget.status === 'aceptado' || budget.status === 'rechazado')
      throw redirect({ to: '/presupuestos/$budgetId', params })
  },
  component: EditBudgetRoute,
})

function EditBudgetRoute() {
  const { budgetId } = Route.useParams()
  const budget = useWorkspace().budgets.find((item) => item.id === budgetId)
  if (!budget) return null
  return <BudgetEditorPage key={budgetId} budgetId={budgetId} initial={draftFromBudget(budget)} />
}
