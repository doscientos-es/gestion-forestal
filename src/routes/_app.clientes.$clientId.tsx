import { createFileRoute, notFound } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { ClientDetailPage } from '@/features/clients'
import { useWorkspace } from '@/features/workspace'

export const Route = createFileRoute('/_app/clientes/$clientId')({
  beforeLoad: async ({ context, params }) => {
    const { workspace } = await requireArea(context, 'clientes')
    if (!workspace.clients.some((client) => client.id === params.clientId)) throw notFound()
  },
  component: ClientDetailRoute,
})

function ClientDetailRoute() {
  const { clientId } = Route.useParams()
  const client = useWorkspace().clients.find((item) => item.id === clientId)
  return client ? <ClientDetailPage client={client} /> : null
}
