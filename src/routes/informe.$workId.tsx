import { createFileRoute, notFound } from '@tanstack/react-router'

import { WorkReportPublicPage } from '@/features/works'
import { prepareApp, useWorkspace } from '@/features/workspace'

/** Public work report link sent to the client: no sign-in, no app shell. */
export const Route = createFileRoute('/informe/$workId')({
  // `?previa=1`: the office checking the page; it is not recorded as a visit.
  validateSearch: (search: Record<string, unknown>): { previa?: true } =>
    search.previa === 1 || search.previa === '1' || search.previa === true
      ? { previa: true }
      : {},
  beforeLoad: async ({ context, params }) => {
    const { workspace } = await prepareApp(context.queryClient)
    if (!workspace.works.some((work) => work.id === params.workId)) throw notFound()
  },
  component: WorkReportRoute,
})

function WorkReportRoute() {
  const { workId } = Route.useParams()
  const { previa } = Route.useSearch()
  const work = useWorkspace().works.find((item) => item.id === workId)
  return work ? <WorkReportPublicPage work={work} preview={previa === true} /> : null
}
