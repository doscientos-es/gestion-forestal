import { Button, ConfirmDialog, DropdownMenuItem, toast } from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { Check, Mail, TreePine } from 'lucide-react'
import { useState } from 'react'

import { ActivityTimeline } from '@/features/activity'
import {
  activityFor,
  budgetStatus,
  estimateStoredBudget,
  lookup,
  useWorkspace,
  type Budget,
} from '@/features/workspace'
import { formatDate, formatMoney, formatNumber } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { RowMenu } from '@/shared/ui/data-table'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { FilterTabs } from '@/shared/ui/filter-tabs'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

import { budgetsApi } from '../api'
import { BudgetPreview } from './budget-preview'
import { BudgetProposalTab } from './budget-proposal-tab'
import { BudgetTrackingStrip } from './budget-tracking'
import { SendBudgetDialog, proposalLink } from './send-budget-dialog'

type Tab = 'partidas' | 'propuesta' | 'historial'

export function BudgetDetailPage({ budget }: { budget: Budget }) {
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const [confirmAccept, setConfirmAccept] = useState(false)
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState<Tab>('partidas')
  const history = activityFor(workspace.activity, 'budget', budget.id)
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
  const reject = useCommand(() => budgetsApi.setStatus(budget.id, 'rechazado'), {
    success: 'Presupuesto marcado como rechazado',
  })
  const acceptButton = (
    <Button
      variant={budget.status === 'enviado' ? 'default' : 'outline'}
      onPress={() => setConfirmAccept(true)}
    >
      <Check aria-hidden="true" className="size-4" /> Aceptar y crear obra
    </Button>
  )

  return (
    <>
      <PageTop
        back={{ to: '/presupuestos', label: 'Volver a presupuestos' }}
        title={budget.title}
        description={`${budget.number} · ${find.client(budget.clientId)?.name ?? ''} · ${find.zone(budget.zoneId)?.name ?? ''} · ${formatDate(budget.date)}`}
        actions={
          <>
            {editable ? (
              <Button
                variant={budget.status === 'borrador' ? 'default' : 'outline'}
                onPress={() => setSending(true)}
              >
                <Mail aria-hidden="true" className="size-4" />
                {budget.status === 'enviado' ? 'Reenviar al cliente' : 'Enviar al cliente'}
              </Button>
            ) : null}
            {editable ? acceptButton : null}
            {budget.workId ? (
              <Button
                onPress={() =>
                  void navigate({ to: '/obras/$workId', params: { workId: budget.workId ?? '' } })
                }
              >
                <TreePine aria-hidden="true" className="size-4" /> Ver obra
              </Button>
            ) : null}
            <RowMenu label="Más acciones del presupuesto">
              {editable ? (
                <DropdownMenuItem
                  onAction={() =>
                    void navigate({
                      to: '/presupuestos/$budgetId/editar',
                      params: { budgetId: budget.id },
                    })
                  }
                >
                  Editar presupuesto
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onAction={() =>
                  void navigate({ to: '/presupuestos/nuevo', search: { desde: budget.id } })
                }
              >
                Duplicar presupuesto
              </DropdownMenuItem>
              <DropdownMenuItem
                onAction={() => {
                  void navigator.clipboard?.writeText(proposalLink(budget.id))
                  toast.success('Enlace copiado', {
                    description: 'Al abrirlo, la visita queda anotada en el historial.',
                  })
                }}
              >
                Copiar enlace del cliente
              </DropdownMenuItem>
              {budget.status === 'enviado' ? (
                <DropdownMenuItem onAction={() => reject.mutate(undefined)}>
                  Marcar como rechazado
                </DropdownMenuItem>
              ) : null}
            </RowMenu>
          </>
        }
      />
      <BudgetTrackingStrip budget={budget} workspace={workspace} />
      <div className="mb-4">
        <FilterTabs
          label="Secciones del presupuesto"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'partidas', label: 'Partidas', count: budget.lines.length },
            { value: 'propuesta', label: 'Propuesta del cliente', count: 1 },
            { value: 'historial', label: 'Historial', count: history.length },
          ]}
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {tab === 'propuesta' ? (
          <BudgetProposalTab budget={budget} workspace={workspace} />
        ) : tab === 'historial' ? (
          <Panel aria-labelledby="detail-history">
            <PanelHeader id="detail-history" title="Historial" meta={history.length} />
            {history.length === 0 ? (
              <EmptyPanel
                icon={<Mail className="size-5" />}
                title="Todavía no ha pasado nada"
                description="Cuando envíes la propuesta o el cliente la abra, quedará anotado aquí."
              />
            ) : (
              <ActivityTimeline events={history} workspace={workspace} limit={50} />
            )}
          </Panel>
        ) : (
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
        )}
        <BudgetPreview estimate={estimate} />
      </div>
      <SendBudgetDialog budget={sending ? budget : null} onClose={() => setSending(false)} />
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
