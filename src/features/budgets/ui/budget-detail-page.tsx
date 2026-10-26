import { Button, ConfirmDialog, IconButton } from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { Check, Copy, Pencil, Send, TreePine, X } from 'lucide-react'
import { useState } from 'react'

import {
  budgetStatus,
  estimateStoredBudget,
  lookup,
  useWorkspace,
  type Budget,
} from '@/features/workspace'
import { formatDate, formatMoney, formatNumber } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

import { budgetsApi } from '../api'
import { BudgetPreview } from './budget-preview'

export function BudgetDetailPage({ budget }: { budget: Budget }) {
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const [confirmAccept, setConfirmAccept] = useState(false)
  const find = lookup(workspace)
  const estimate = estimateStoredBudget(budget, workspace.species)
  const status = budgetStatus[budget.status]
  const editable = budget.status === 'borrador' || budget.status === 'enviado'

  const accept = useCommand(() => budgetsApi.accept(budget.id), {
    success: () => ({
      title: 'Presupuesto aceptado',
      description: 'Se ha creado la obra. Ahora puedes asignarla a una cuadrilla.',
    }),
    onSuccess: (work) => {
      setConfirmAccept(false)
      void navigate({ to: '/obras/$workId', params: { workId: work.id } })
    },
  })
  const setStatus = useCommand(
    (next: 'enviado' | 'rechazado') => budgetsApi.setStatus(budget.id, next),
    {
      success: (_output, next) => ({
        title:
          next === 'enviado'
            ? 'Marcado como enviado al cliente'
            : 'Presupuesto marcado como rechazado',
      }),
    },
  )

  return (
    <>
      <PageTop
        back={{ to: '/presupuestos', label: 'Volver a presupuestos' }}
        title={budget.title}
        description={`${budget.number} · ${find.client(budget.clientId)?.name ?? ''} · ${find.zone(budget.zoneId)?.name ?? ''} · ${formatDate(budget.date)}`}
        actions={
          <>
            <IconButton
              label="Duplicar presupuesto"
              variant="outline"
              onPress={() =>
                void navigate({ to: '/presupuestos/nuevo', search: { desde: budget.id } })
              }
            >
              <Copy aria-hidden="true" className="size-4" />
            </IconButton>
            {editable ? (
              <IconButton
                label="Editar presupuesto"
                variant="outline"
                onPress={() =>
                  void navigate({
                    to: '/presupuestos/$budgetId/editar',
                    params: { budgetId: budget.id },
                  })
                }
              >
                <Pencil aria-hidden="true" className="size-4" />
              </IconButton>
            ) : null}
            {budget.status === 'borrador' ? (
              <Button variant="outline" onPress={() => setStatus.mutate('enviado')}>
                <Send aria-hidden="true" className="size-4" /> Marcar enviado
              </Button>
            ) : null}
            {budget.status === 'enviado' ? (
              <Button variant="outline" onPress={() => setStatus.mutate('rechazado')}>
                <X aria-hidden="true" className="size-4" /> Rechazado
              </Button>
            ) : null}
            {editable ? (
              <Button onPress={() => setConfirmAccept(true)}>
                <Check aria-hidden="true" className="size-4" /> Aceptar y crear obra
              </Button>
            ) : null}
            {budget.workId ? (
              <Button
                onPress={() =>
                  void navigate({ to: '/obras/$workId', params: { workId: budget.workId ?? '' } })
                }
              >
                <TreePine aria-hidden="true" className="size-4" /> Ver obra
              </Button>
            ) : null}
          </>
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel aria-labelledby="detail-lines">
          <PanelHeader
            id="detail-lines"
            title="Partidas"
            action={
              <Tag tone={status.tone} dot>
                {status.label}
              </Tag>
            }
          />
          <ul className="divide-border divide-y">
            {budget.lines.map((line, index) => {
              const item = estimate.lines[index]
              return (
                <li key={line.id} className="grid grid-cols-[1fr_auto] gap-2 px-5 py-4 text-sm">
                  <div>
                    <p className="font-semibold">
                      {line.kind === 'plantacion'
                        ? find.species(line.speciesId)?.name
                        : line.description}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {line.kind === 'plantacion'
                        ? `${formatNumber(line.hectares, 2)} ha × ${formatNumber(line.density)} pl/ha · ${formatNumber(line.yieldPerDay)} pl/peón y día`
                        : `${formatNumber(line.hectares, 2)} ha · ${formatNumber(line.hectaresPerDay, 2)} ha/peón y día`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">
                      {formatNumber(item?.workerDays ?? 0, 1)} peonadas
                    </p>
                    {item && item.plants > 0 ? (
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {formatNumber(item.plants)} plantas
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
          {budget.notes ? (
            <p className="text-muted-foreground border-border border-t px-5 py-4 text-sm">
              {budget.notes}
            </p>
          ) : null}
        </Panel>
        <BudgetPreview estimate={estimate} />
      </div>
      <ConfirmDialog
        open={confirmAccept}
        onOpenChange={setConfirmAccept}
        title="¿Aceptar el presupuesto?"
        description={`Se creará la obra con ${formatNumber(estimate.crewDays)} días de cuadrilla y ${formatMoney(estimate.price)} de precio. Estas cifras quedan fijadas para comparar con lo real.`}
        confirmLabel="Aceptar y crear obra"
        pending={accept.isPending}
        onConfirm={() => accept.mutate(undefined)}
      />
    </>
  )
}
