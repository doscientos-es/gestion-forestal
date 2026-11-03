import { createFileRoute, notFound } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { IncidentDetailPage } from '@/features/incidents'
import { canManageIncident, useCurrentUser, useWorkspace } from '@/features/workspace'

export const Route = createFileRoute('/_app/incidencias/$incidentId')({
  beforeLoad: async ({ context, params }) => {
    const { user, workspace } = await requireArea(context, 'incidencias')
    const incident = workspace.incidents.find((item) => item.id === params.incidentId)
    if (!incident || !canManageIncident(incident, user)) throw notFound()
  },
  component: IncidentRoute,
})

function IncidentRoute() {
  const { incidentId } = Route.useParams()
  const incident = useWorkspace().incidents.find((item) => item.id === incidentId)
  const user = useCurrentUser()
  return incident && user && canManageIncident(incident, user) ? <IncidentDetailPage key={incident.id} incident={incident} /> : null
}