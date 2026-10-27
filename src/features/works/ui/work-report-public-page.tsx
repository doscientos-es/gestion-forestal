import { Button } from '@doscientos/ui'
import { useQueryClient } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { useWorkspace, type Work } from '@/features/workspace'

import { worksApi } from '../api'
import { WorkReportDocument } from './work-report-document'

/**
 * What the client sees when they open the report link. Opening it is recorded in the activity
 * history. In the demo it lives in the same browser; production serves it publicly.
 */
export function WorkReportPublicPage({ work }: { work: Work }) {
  const workspace = useWorkspace()
  const queryClient = useQueryClient()
  // StrictMode runs effects twice in development: count the visit once.
  const counted = useRef(false)
  useEffect(() => {
    if (counted.current) return
    counted.current = true
    void worksApi.recordReportView(work.id).then(() => queryClient.invalidateQueries())
  }, [work.id, queryClient])

  return (
    <main className="app-canvas min-h-dvh px-4 py-6 sm:px-8">
      <div className="mx-auto mb-4 flex w-full max-w-3xl justify-end print:hidden">
        <Button variant="outline" size="sm" onPress={() => window.print()}>
          <Printer aria-hidden="true" className="size-4" /> Imprimir o guardar PDF
        </Button>
      </div>
      <h1 className="sr-only">Informe de obra {work.code}</h1>
      <WorkReportDocument work={work} workspace={workspace} />
    </main>
  )
}
