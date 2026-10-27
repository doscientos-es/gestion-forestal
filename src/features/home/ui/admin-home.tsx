import { Button, IconButton, MetricCard, MetricGrid } from '@doscientos/ui'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowUpRight, ChevronRight, Inbox, Mail, Plus, TreePine } from 'lucide-react'

import { followUpSummary } from '@/features/activity'
import { YieldDeviation } from '@/features/works'
import {
  absenceType,
  calculatePerformance,
  invoiceTotals,
  lookup,
  proposeDraft,
  summarizeYear,
  workStatus,
  type Person,
  type Workspace,
} from '@/features/workspace'
import { formatMoney, formatNumber, formatPercent, formatShortDate } from '@/shared/lib/format'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader, ProgressBar, Tag } from '@/shared/ui/surface'

export function AdminHome({
  user,
  workspace,
  today,
}: {
  user: Person
  workspace: Workspace
  today: string
}) {
  const navigate = useNavigate()
  const find = lookup(workspace)
  const year = Math.max(...workspace.works.map((work) => work.year))
  const summary = summarizeYear(workspace, year)
  const active = workspace.works
    .filter((work) => work.status === 'en_curso')
    .map((work) => ({
      work,
      performance: calculatePerformance(work, workspace.reports, workspace.people),
    }))
  const followUp = followUpSummary(workspace, today)
  const pendingCollection = workspace.invoices
    .filter((item) => item.status === 'enviada')
    .reduce((sum, item) => sum + invoiceTotals(item).total, 0)
  const todo = [
    ...workspace.absences
      .filter((item) => item.status === 'solicitada')
      .map((item) => ({
        id: item.id,
        to: '/ausencias' as const,
        title: `${find.person(item.personId)?.name} pide ${absenceType[item.type].toLowerCase()}`,
        meta: `${formatShortDate(item.start)} – ${formatShortDate(item.end)}`,
      })),
    ...workspace.works
      .filter((work) => work.status === 'pendiente')
      .map((work) => ({
        id: work.id,
        to: '/planificacion' as const,
        title: `Planificar «${work.title}»`,
        meta: `${work.planned.crewDays} días de cuadrilla`,
      })),
    ...workspace.works
      .filter(
        (work) =>
          work.status === 'terminada' &&
          proposeDraft(
            work,
            calculatePerformance(work, workspace.reports, workspace.people),
            workspace.invoices,
          ),
      )
      .map((work) => ({
        id: `f-${work.id}`,
        to: '/obras' as const,
        title: `Facturar «${work.title}»`,
        meta: formatMoney(work.planned.price),
      })),
  ]

  return (
    <>
      <PageTop
        title={`Hola, ${user.name.split(' ')[0]}`}
        description={`Así va la campaña ${year}.`}
        actions={
          <Button onPress={() => void navigate({ to: '/presupuestos/nuevo' })}>
            <Plus aria-hidden="true" className="size-4" /> Nuevo presupuesto
          </Button>
        }
      />
      <MetricGrid className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Obras en curso"
          value={active.length}
          description={`${summary.works} obras en la campaña`}
        />
        <MetricCard
          label="Margen estimado"
          value={formatMoney(summary.margin)}
          description={`${formatPercent(summary.marginRate)} sobre ${formatMoney(summary.revenue)}`}
        />
        <MetricCard
          label="Rendimiento real"
          value={`${formatNumber(summary.actualYield)} pl/peón`}
          description={`Presupuestado ${formatNumber(summary.plannedYield)}`}
        />
        <MetricCard
          label="Pendiente de cobro"
          value={formatMoney(pendingCollection)}
          description="Facturas en gestoría"
        />
      </MetricGrid>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel aria-labelledby="active-title">
          <PanelHeader
            id="active-title"
            icon={<TreePine className="size-5" strokeWidth={1.75} />}
            title="Obras en curso"
            description="Avance y rendimiento frente al presupuesto."
            action={
              <IconButton
                label="Ver todas las obras"
                variant="ghost"
                size="icon-sm"
                onPress={() => void navigate({ to: '/obras' })}
              >
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </IconButton>
            }
          />
          <ul className="divide-border divide-y">
            {active.map(({ work, performance }) => (
              <li key={work.id}>
                <Link
                  to="/obras/$workId"
                  params={{ workId: work.id }}
                  className="panel-row flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4"
                >
                  <span className="min-w-48 flex-1 basis-56">
                    <span className="block truncate text-sm font-semibold">{work.title}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {find.zone(work.zoneId)?.name} · {formatNumber(performance.plants)} de{' '}
                      {formatNumber(work.planned.plants)} plantas
                    </span>
                  </span>
                  <span className="flex w-40 shrink-0 items-center gap-2">
                    <ProgressBar
                      value={performance.progress}
                      label={`Avance de ${work.title}`}
                      tone={performance.yieldDeviation < -0.05 ? 'warning' : 'brand'}
                    />
                    <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">
                      {formatPercent(Math.min(performance.progress, 1))}
                    </span>
                  </span>
                  <span className="flex w-44 shrink-0 justify-end">
                    <YieldDeviation
                      value={performance.yieldDeviation}
                      hasData={performance.workerDays > 0}
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="space-y-5">
          <Panel aria-labelledby="todo-title">
            <PanelHeader
              id="todo-title"
              icon={<Inbox className="size-5" strokeWidth={1.75} />}
              title="Pendiente de ti"
              meta={todo.length}
            />
            {todo.length === 0 ? (
              <p className="text-muted-foreground px-5 py-8 text-sm">
                Nada pendiente. Buen trabajo.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {todo.map((item) => (
                  <li key={item.id}>
                    <Link to={item.to} className="panel-row flex items-center gap-3 px-5 py-3.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.title}</span>
                        <span className="text-muted-foreground block text-xs">{item.meta}</span>
                      </span>
                      <ChevronRight aria-hidden="true" className="text-muted-foreground size-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel aria-labelledby="followup-title">
            <PanelHeader
              id="followup-title"
              icon={<Mail className="size-5" strokeWidth={1.75} />}
              title="Propuestas esperando respuesta"
              description={`${formatMoney(followUp.waitingValue)} en juego · ${followUp.viewsThisWeek} aperturas esta semana`}
              meta={followUp.waiting.length}
            />
            {followUp.waiting.length === 0 ? (
              <p className="text-muted-foreground px-5 py-6 text-sm">
                No hay propuestas enviadas pendientes de respuesta.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {followUp.waiting.map(({ budget, views, price }) => (
                  <li key={budget.id}>
                    <Link
                      to="/presupuestos/$budgetId"
                      params={{ budgetId: budget.id }}
                      className="panel-row flex items-center gap-3 px-5 py-3.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{budget.title}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {find.client(budget.clientId)?.name} · {formatMoney(price)}
                        </span>
                      </span>
                      <Tag tone={views === 0 ? 'amber' : 'purple'} dot>
                        {views === 0 ? 'Sin abrir' : `Visto ${views}×`}
                      </Tag>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
      <p className="text-muted-foreground mt-6 text-xs">
        Hoy: {formatShortDate(today)} · {workStatus.en_curso.label}: {active.length} · Datos de
        ejemplo
      </p>
    </>
  )
}
