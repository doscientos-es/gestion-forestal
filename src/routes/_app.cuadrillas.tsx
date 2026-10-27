import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { CrewsPage } from '@/features/crews'

export const Route = createFileRoute('/_app/cuadrillas')({
  beforeLoad: ({ context }) => requireArea(context, 'cuadrillas'),
  component: CrewsPage,
})
