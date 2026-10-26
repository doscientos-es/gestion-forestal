import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { NotificationsPage } from '@/features/tasks'

export const Route = createFileRoute('/_app/avisos')({
  beforeLoad: ({ context }) => requireArea(context, 'avisos'),
  component: NotificationsPage,
})
