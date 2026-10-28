import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { useWorkspace, type Work } from '@/features/workspace'
import { PublicTopBar } from '@/shared/ui/public-top-bar'

import { worksApi } from '../api'
import { WorkReportDocument } from './work-report-document'

/**
 * What the client sees when they open the report link. Opening it is recorded in the activity
 * history. In the demo it lives in the same browser; production serves it publicly.
 */
export function WorkReportPublicPage({ work, preview }: { work: Work; preview: boolean }) {
  const workspace = useWorkspace()
  const queryClient = useQueryClient()
  // StrictMode runs effects twice in development: count the visit once.
  const counted = useRef(false)
  useEffect(() => {
    // The office checking the page (`?previa=1`) is not the client: nothing is recorded.
    if (counted.current || preview) return
    counted.current = true
    void worksApi.recordReportView(work.id).then(() => queryClient.invalidateQueries())
  }, [work.id, preview, queryClient])

  return (
    <main className="app-canvas min-h-dvh px-4 py-6 sm:px-8">
      <PublicTopBar preview={preview} />
      <h1 className="sr-only">Informe de obra {work.code}</h1>
      <WorkReportDocument work={work} workspace={workspace} />
    </main>
  )
}
