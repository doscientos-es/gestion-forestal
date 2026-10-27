import { createFileRoute, notFound } from '@tanstack/react-router'

import { BudgetPublicPage } from '@/features/budgets'
import { prepareApp, useWorkspace } from '@/features/workspace'

/** Public proposal link sent to the client: no sign-in, no app shell. */
export const Route = createFileRoute('/propuesta/$budgetId')({
  beforeLoad: async ({ context, params }) => {
    const { workspace } = await prepareApp(context.queryClient)
    if (!workspace.budgets.some((budget) => budget.id === params.budgetId)) throw notFound()
  },
  component: ProposalRoute,
})

function ProposalRoute() {
  const { budgetId } = Route.useParams()
  const budget = useWorkspace().budgets.find((item) => item.id === budgetId)
  return budget ? <BudgetPublicPage budget={budget} /> : null
}
