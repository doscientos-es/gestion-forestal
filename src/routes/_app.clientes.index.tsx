import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { ClientsPage } from '@/features/clients'

export const Route = createFileRoute('/_app/clientes/')({
  beforeLoad: ({ context }) => requireArea(context, 'clientes'),
  component: ClientsPage,
})
