import { Button, MetricCard, MetricGrid } from '@doscientos/ui'
import { Link } from '@tanstack/react-router'
import { FileText, History, Landmark, Pencil, TreePine } from 'lucide-react'
import { useState } from 'react'

import { ActivityTimeline } from '@/features/activity'
import { YieldDeviation } from '@/features/works'
import {
  budgetStatus,
  clientActivity,
  clientKind,
  clientOverview,
  formatIban,
  useWorkspace,
  workStatus,
  type Client,
} from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { formatDate, formatMoney, formatNumber, formatPercent } from '@/shared/lib/format'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader, ProgressBar, Stat, Tag } from '@/shared/ui/surface'

import { ClientCampaignsPanel } from './client-campaigns-panel'
import { ClientDialog } from './client-dialog'
import { ClientOverdueAlert } from './client-overdue-alert'
import { ClientQuickActions } from './client-quick-actions'

const HISTORY_PREVIEW = 8

export function ClientDetailPage({ client }: { client: Client }) {
  const workspace = useWorkspace()
  const [editing, setEditing] = useState(false)
  const [allHistory, setAllHistory] = useState(false)
  const overview = clientOverview(workspace, client, clock.today())
  const budgets = [...overview.budgets].sort((a, b) => b.date.localeCompare(a.date))
  const history = clientActivity(workspace, client.id)

  return (
    <>
      <PageTop
        back={{ to: '/clientes', label: 'Volver a clientes' }}
        title={client.name}
        description={[clientKind[client.kind], client.town].filter(Boolean).join(' · ')}
        actions={
          <>
            <Button variant="ghost" onPress={() => setEditing(true)}>
              <Pencil aria-hidden="true" className="size-4" /> Editar datos
            </Button>
            <ClientQuickActions client={client} works={overview.works.map((item) => item.work)} />
          </>
        }
      />
      <ClientOverdueAlert overdue={overview.overdue} total={overview.overdueTotal} />
      <MetricGrid className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Contratado"
          value={formatMoney(overview.contracted)}
          description={`${formatNumber(overview.works.length)} obras · ${formatNumber(overview.accepted.length)} presupuestos aceptados`}
        />
        <MetricCard
          label="Facturado"
          value={formatMoney(overview.invoiced)}
          description={`${formatMoney(overview.collected)} cobrado · ${formatMoney(overview.invoiced - overview.collected)} pendiente`}
          tone={overview.invoiced > overview.collected ? 'warning' : 'default'}
        />
        <MetricCard
          label="Margen real"
          value={overview.marginRate === null ? '—' : formatPercent(overview.marginRate)}
          description={
            overview.plannedMarginRate === null
              ? 'Sin obras'
              : `${formatMoney(overview.margin)} · se presupuestó ${formatPercent(overview.plannedMarginRate)}`
          }
          tone={overview.belowTarget ? 'warning' : 'default'}
        />
        <MetricCard
          label="Aceptación de propuestas"
          value={overview.acceptanceRate === null ? '—' : formatPercent(overview.acceptanceRate)}
          description={`${formatNumber(overview.budgets.length)} presupuestos en total`}
        />
      </MetricGrid>
      <Panel aria-labelledby="client-data-title" className="mb-5">
        <PanelHeader
          id="client-data-title"
          icon={<Landmark className="size-5" strokeWidth={1.75} />}
          title="Datos y cuenta bancaria"
        />
        <dl className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="CIF / NIF" value={client.taxId || 'Sin CIF'} />
          <Stat label="Correo" value={client.email || 'Sin correo'} />
          <Stat label="Teléfono" value={client.phone || 'Sin teléfono'} />
          <Stat
            label="IBAN"
            value={client.iban ? formatIban(client.iban) : <Tag tone="amber">Sin IBAN</Tag>}
          />
        </dl>
      </Panel>
      <ClientCampaignsPanel years={overview.years} />
      <Panel aria-labelledby="client-works-title" className="mb-5">
        <PanelHeader
          id="client-works-title"
          icon={<TreePine className="size-5" strokeWidth={1.75} />}
          title="Obras contratadas"
          description="Avance y rendimiento frente a lo presupuestado."
          meta={formatNumber(overview.works.length)}
        />
        {overview.works.length === 0 ? (
          <EmptyPanel
            icon={<TreePine className="size-5" />}
            title="Todavía no ha contratado ninguna obra"
            description="Las obras aparecen cuando acepta un presupuesto."
          />
        ) : (
          <ul className="divide-border divide-y">
            {overview.works.map(({ work, performance }) => {
              const status = workStatus[work.status]
              return (
                <li key={work.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                  <Link
                    to="/obras/$workId"
                    params={{ workId: work.id }}
                    className="min-w-48 flex-1 text-sm font-medium hover:underline"
                  >
                    {work.title}
                    <span className="text-muted-foreground block text-xs font-normal">
                      {work.code} · Campaña {work.year} · {formatMoney(work.planned.price)}
                    </span>
                  </Link>
                  <span className="flex w-36 items-center gap-2">
                    <ProgressBar value={performance.progress} label={`Avance de ${work.title}`} />
                    <span className="text-muted-foreground w-9 shrink-0 text-right text-xs tabular-nums">
                      {formatPercent(Math.min(performance.progress, 1))}
                    </span>
                  </span>
                  <YieldDeviation
                    value={performance.yieldDeviation}
                    hasData={performance.workerDays > 0}
                  />
                  <Tag tone={status.tone} dot>
                    {status.label}
                  </Tag>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
      <Panel aria-labelledby="client-budgets-title" className="mb-5">
        <PanelHeader
          id="client-budgets-title"
          icon={<FileText className="size-5" strokeWidth={1.75} />}
          title="Presupuestos"
          meta={formatNumber(budgets.length)}
        />
        {budgets.length === 0 ? (
          <p className="text-muted-foreground px-5 py-6 text-sm">Sin presupuestos todavía.</p>
        ) : (
          <ul className="divide-border divide-y">
            {budgets.map((budget) => (
              <li key={budget.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                <Link
                  to="/presupuestos/$budgetId"
                  params={{ budgetId: budget.id }}
                  className="min-w-48 flex-1 text-sm font-medium hover:underline"
                >
                  {budget.title}
                  <span className="text-muted-foreground block text-xs font-normal">
                    {budget.number} · {formatDate(budget.date)}
                  </span>
                </Link>
                <Tag tone={budgetStatus[budget.status].tone}>{budgetStatus[budget.status].label}</Tag>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel aria-labelledby="client-history-title">
        <PanelHeader
          id="client-history-title"
          icon={<History className="size-5" strokeWidth={1.75} />}
          title="Historial"
          description="Propuestas enviadas y abiertas, facturas e informes de obra."
          meta={formatNumber(history.length)}
          action={
            history.length > HISTORY_PREVIEW ? (
              <Button variant="outline" size="sm" onPress={() => setAllHistory((value) => !value)}>
                {allHistory ? 'Ver menos' : 'Ver todo'}
              </Button>
            ) : undefined
          }
        />
        {history.length === 0 ? (
          <p className="text-muted-foreground px-5 py-6 text-sm">Todavía no hay movimientos.</p>
        ) : (
          <ActivityTimeline
            events={history}
            workspace={workspace}
            limit={allHistory ? history.length : HISTORY_PREVIEW}
          />
        )}
      </Panel>
      {editing ? <ClientDialog client={client} onClose={() => setEditing(false)} /> : null}
    </>
  )
}
