import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { BudgetListPage } from '@/features/budgets'

export const Route = createFileRoute('/_app/presupuestos/')({
  beforeLoad: ({ context }) => requireArea(context, 'presupuestos'),
  component: BudgetListPage,
})
