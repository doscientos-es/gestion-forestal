import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { ActivityPage } from '@/features/activity'

export const Route = createFileRoute('/_app/actividad')({
  beforeLoad: ({ context }) => requireArea(context, 'actividad'),
  component: ActivityPage,
})
