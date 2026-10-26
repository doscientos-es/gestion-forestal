import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { DailyReportPage } from '@/features/daily-report'

export const Route = createFileRoute('/_app/parte')({
  beforeLoad: ({ context }) => requireArea(context, 'parte'),
  component: DailyReportPage,
})
