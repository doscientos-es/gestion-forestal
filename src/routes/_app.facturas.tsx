import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { InvoicesPage } from '@/features/invoices'

export const Route = createFileRoute('/_app/facturas')({
  beforeLoad: ({ context }) => requireArea(context, 'facturas'),
  component: InvoicesPage,
})
