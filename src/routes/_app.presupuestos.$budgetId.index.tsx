import { createFileRoute, notFound } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { BudgetDetailPage } from '@/features/budgets'
import { useWorkspace } from '@/features/workspace'

export const Route = createFileRoute('/_app/presupuestos/$budgetId/')({
  beforeLoad: async ({ context, params }) => {
    const { workspace } = await requireArea(context, 'presupuestos')
    if (!workspace.budgets.some((budget) => budget.id === params.budgetId)) throw notFound()
  },
  component: BudgetDetailRoute,
})

function BudgetDetailRoute() {
  const { budgetId } = Route.useParams()
  const budget = useWorkspace().budgets.find((item) => item.id === budgetId)
  return budget ? <BudgetDetailPage budget={budget} /> : null
}
