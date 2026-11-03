import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { IncidentsPage } from '@/features/incidents'

export const Route = createFileRoute('/_app/incidencias/')({
  validateSearch: (search: Record<string, unknown>): { cliente?: string } => ({
    ...(typeof search.cliente === 'string' ? { cliente: search.cliente } : {}),
  }),
  beforeLoad: ({ context }) => requireArea(context, 'incidencias'),
  component: IncidentsRoute,
})

function IncidentsRoute() {
  const { cliente } = Route.useSearch()
  return <IncidentsPage key={cliente ?? 'all'} {...(cliente ? { clientId: cliente } : {})} />
}