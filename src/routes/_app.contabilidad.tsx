import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { AccountingPage } from '@/features/accounting'

export const Route = createFileRoute('/_app/contabilidad')({
  beforeLoad: ({ context }) => requireArea(context, 'contabilidad'),
  component: AccountingPage,
})
