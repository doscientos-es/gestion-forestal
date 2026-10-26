import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { ReportsPage } from '@/features/reports'

export const Route = createFileRoute('/_app/informes')({
  beforeLoad: ({ context }) => requireArea(context, 'informes'),
  component: ReportsPage,
})
