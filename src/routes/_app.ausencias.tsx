import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { AbsencesPage } from '@/features/absences'

export const Route = createFileRoute('/_app/ausencias')({
  beforeLoad: ({ context }) => requireArea(context, 'ausencias'),
  component: AbsencesPage,
})
