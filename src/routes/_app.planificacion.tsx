import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { PlanningPage } from '@/features/planning'

export const Route = createFileRoute('/_app/planificacion')({
  beforeLoad: ({ context }) => requireArea(context, 'planificacion'),
  component: PlanningPage,
})
