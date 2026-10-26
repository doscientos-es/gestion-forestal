import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { WorkListPage } from '@/features/works'

export const Route = createFileRoute('/_app/obras/')({
  beforeLoad: ({ context }) => requireArea(context, 'obras'),
  component: WorkListPage,
})
