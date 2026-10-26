import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { ExpensesPage } from '@/features/expenses'

export const Route = createFileRoute('/_app/gastos')({
  beforeLoad: ({ context }) => requireArea(context, 'gastos'),
  component: ExpensesPage,
})
