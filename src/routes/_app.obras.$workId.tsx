import { createFileRoute, notFound } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { WorkDetailPage, visibleWorks } from '@/features/works'
import { useWorkspace } from '@/features/workspace'

export const Route = createFileRoute('/_app/obras/$workId')({
  beforeLoad: async ({ context, params }) => {
    const { user, workspace } = await requireArea(context, 'obras')
    if (!visibleWorks(workspace, user).some((work) => work.id === params.workId)) throw notFound()
  },
  component: WorkDetailRoute,
})

function WorkDetailRoute() {
  const { workId } = Route.useParams()
  const work = useWorkspace().works.find((item) => item.id === workId)
  return work ? <WorkDetailPage work={work} /> : null
}
