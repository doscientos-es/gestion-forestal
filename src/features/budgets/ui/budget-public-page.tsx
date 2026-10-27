import { Button } from '@doscientos/ui'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, Printer } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { useWorkspace, type Budget } from '@/features/workspace'

import { budgetsApi } from '../api'
import { BudgetDocument } from './budget-document'

/**
 * What the client sees when they open the link in the email. Opening it is recorded as a view in
 * the budget's history. In the demo it lives in the same browser; production serves it publicly.
 */
export function BudgetPublicPage({ budget }: { budget: Budget }) {
  const workspace = useWorkspace()
  const queryClient = useQueryClient()
  // StrictMode runs effects twice in development: count the visit once.
  const counted = useRef(false)
  useEffect(() => {
    if (counted.current) return
    counted.current = true
    void budgetsApi.recordView(budget.id).then(() => queryClient.invalidateQueries())
  }, [budget.id, queryClient])

  return (
    <main className="app-canvas min-h-dvh px-4 py-6 sm:px-8">
      <div className="mx-auto mb-4 flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <Eye aria-hidden="true" className="size-4" />
          Vista del cliente · demostración. Esta visita ya consta en el historial.
        </p>
        <Button variant="outline" size="sm" onPress={() => window.print()}>
          <Printer aria-hidden="true" className="size-4" /> Imprimir o guardar PDF
        </Button>
      </div>
      <h1 className="sr-only">Propuesta {budget.number}</h1>
      <BudgetDocument budget={budget} workspace={workspace} />
    </main>
  )
}
