import { Alert, AlertDescription, AlertTitle, Button, ConfirmDialog } from '@doscientos/ui'
import { useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useWorkspace, type Budget } from '@/features/workspace'
import { useCommand } from '@/shared/lib/use-command'
import { PublicTopBar } from '@/shared/ui/public-top-bar'

import { budgetsApi } from '../api'
import { BudgetDocument } from './budget-document'

/**
 * What the client sees when they open the link in the email. Opening it is recorded as a view in
 * the budget's history. In the demo it lives in the same browser; production serves it publicly.
 */
export function BudgetPublicPage({ budget, preview }: { budget: Budget; preview: boolean }) {
  const workspace = useWorkspace()
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState<'aceptado' | 'rechazado' | null>(null)
  const respond = useCommand(
    (decision: 'aceptado' | 'rechazado') => budgetsApi.respond(budget.id, decision),
    {
      success: (_output, decision) => ({
        title: decision === 'aceptado' ? 'Propuesta aceptada' : 'Propuesta rechazada',
        description: 'La empresa ha recibido su respuesta.',
      }),
      onSuccess: () => setConfirm(null),
    },
  )
  // StrictMode runs effects twice in development: count the visit once.
  const counted = useRef(false)
  useEffect(() => {
    // The office checking the page (`?previa=1`) is not the client: nothing is recorded.
    if (counted.current || preview) return
    counted.current = true
    void budgetsApi.recordView(budget.id).then(() => queryClient.invalidateQueries())
  }, [budget.id, preview, queryClient])

  return (
    <main className="app-canvas min-h-dvh px-4 py-6 sm:px-8">
      <PublicTopBar preview={preview} />
      <h1 className="sr-only">Propuesta {budget.number}</h1>
      <BudgetDocument budget={budget} workspace={workspace} />
      <div className="mx-auto mt-4 w-full max-w-3xl print:hidden">
        {/* A draft is not answerable yet; the office still sees where the buttons will be. */}
        {budget.status === 'enviado' || (preview && budget.status === 'borrador') ? (
          <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
            <p className="text-sm">
              {budget.status === 'borrador'
                ? 'Cuando envíe la propuesta, el cliente podrá aceptarla o rechazarla desde aquí.'
                : '¿Le encaja la propuesta? Puede responder desde aquí.'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                isDisabled={respond.isPending || preview}
                onPress={() => setConfirm('rechazado')}
              >
                <X aria-hidden="true" className="size-4" /> Rechazar
              </Button>
              <Button
                isDisabled={respond.isPending || preview}
                onPress={() => setConfirm('aceptado')}
              >
                <Check aria-hidden="true" className="size-4" /> Aceptar propuesta
              </Button>
            </div>
          </div>
        ) : budget.status === 'aceptado' ? (
          <Alert variant="success">
            <Check aria-hidden="true" className="size-4" />
            <AlertTitle>Propuesta aceptada</AlertTitle>
            <AlertDescription>
              Gracias. Nos pondremos en contacto para planificar la obra.
            </AlertDescription>
          </Alert>
        ) : budget.status === 'rechazado' ? (
          <Alert variant="info">
            <X aria-hidden="true" className="size-4" />
            <AlertTitle>Propuesta rechazada</AlertTitle>
            <AlertDescription>Gracias por avisarnos. Quedamos a su disposición.</AlertDescription>
          </Alert>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === 'aceptado' ? '¿Aceptar la propuesta?' : '¿Rechazar la propuesta?'}
        description={
          confirm === 'aceptado'
            ? 'Avisaremos a la empresa para que planifique los trabajos.'
            : 'Avisaremos a la empresa de que no la van a aceptar.'
        }
        confirmLabel={confirm === 'aceptado' ? 'Aceptar propuesta' : 'Rechazar propuesta'}
        pending={respond.isPending}
        onConfirm={() => confirm && respond.mutate(confirm)}
      />
    </main>
  )
}
