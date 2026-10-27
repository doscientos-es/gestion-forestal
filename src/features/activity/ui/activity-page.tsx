import { Button, MetricCard, MetricGrid } from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { Download, History } from 'lucide-react'

import { activityKind, activityToCsv, lookup, useWorkspace } from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { downloadTextFile } from '@/shared/lib/download'
import { formatDateTime, formatMoney, pluralize } from '@/shared/lib/format'
import { useUrlState, useUrlText } from '@/shared/lib/use-url-state'
import { DataTable } from '@/shared/ui/data-table'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { FilterTabs, FilterToolbar, SearchField, type FilterOption } from '@/shared/ui/filter-tabs'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

import {
  activityDocument,
  filterActivity,
  followUpSummary,
  type FeedFilter,
} from '../application/activity-feed'
import { ActivityIcon, actorName } from './activity-timeline'

export function ActivityPage() {
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const find = lookup(workspace)
  const [filter, setFilter] = useUrlState<FeedFilter>('tipo', 'todo', [
    'todo',
    'envios',
    'vistas',
    'facturas',
  ])
  const [query, setQuery] = useUrlText('q')
  const today = clock.today()
  const events = filterActivity(workspace, filter, query)
  const followUp = followUpSummary(workspace, today)
  const count = (value: FeedFilter) => filterActivity(workspace, value, '').length
  const options: FilterOption<FeedFilter>[] = [
    { value: 'todo', label: 'Todo', count: count('todo') },
    { value: 'envios', label: 'Envíos', count: count('envios') },
    { value: 'vistas', label: 'Vistas del cliente', count: count('vistas') },
    { value: 'facturas', label: 'Facturas', count: count('facturas') },
  ]
  const open = (budgetId: string) =>
    void navigate({ to: '/presupuestos/$budgetId', params: { budgetId } })

  return (
    <>
      <PageTop
        title="Actividad"
        description="Qué se ha enviado, a quién y cuántas veces lo ha abierto el cliente."
        actions={
          <Button
            variant="outline"
            isDisabled={events.length === 0}
            onPress={() =>
              downloadTextFile(
                `actividad-${today}.csv`,
                activityToCsv(events, {
                  person: (id) => find.person(id)?.name ?? id,
                  entity: (event) => activityDocument(workspace, event).label,
                }),
              )
            }
          >
            <Download aria-hidden="true" className="size-4" /> Descargar CSV
          </Button>
        }
      />
      <MetricGrid className="mb-5 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Esperando respuesta"
          value={formatMoney(followUp.waitingValue)}
          description={pluralize(
            followUp.waiting.length,
            'propuesta enviada',
            'propuestas enviadas',
          )}
        />
        <MetricCard
          label="Enviadas sin abrir"
          value={followUp.unopened}
          description={
            followUp.unopened > 0 ? 'Merece una llamada' : 'El cliente las ha visto todas'
          }
          tone={followUp.unopened > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          label="Aperturas esta semana"
          value={followUp.viewsThisWeek}
          description="Veces que el cliente ha abierto una propuesta"
        />
      </MetricGrid>
      <FilterToolbar
        tabs={
          <FilterTabs
            label="Filtrar actividad"
            options={options}
            value={filter}
            onChange={setFilter}
          />
        }
      >
        <SearchField
          label="Buscar en la actividad"
          value={query}
          onChange={setQuery}
          placeholder="Documento, persona o correo"
        />
      </FilterToolbar>
      <Panel aria-labelledby="activity-title">
        <PanelHeader
          id="activity-title"
          icon={<History className="size-5" strokeWidth={1.75} />}
          title="Historial"
          meta={events.length}
        />
        {events.length === 0 ? (
          <EmptyPanel
            icon={<History className="size-5" />}
            title="No hay actividad con estos filtros"
            description="Envía un presupuesto por correo y aparecerá aquí junto a sus aperturas."
          />
        ) : (
          <DataTable
            label="Actividad"
            rows={events}
            getKey={(event) => event.id}
            openLabel={(event) =>
              `Abrir ${activityDocument(workspace, event).label}, ${activityKind[event.kind].label}`
            }
            onOpen={(event) => {
              const document = activityDocument(workspace, event)
              if (document.to === '/facturas') void navigate({ to: '/facturas' })
              else if (document.to === '/obras/$workId')
                void navigate({ to: '/obras/$workId', params: { workId: document.workId } })
              else open(document.budgetId)
            }}
            columns={[
              {
                id: 'event',
                header: 'Evento',
                cell: (event) => (
                  <span className="flex items-center gap-3">
                    <ActivityIcon kind={event.kind} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {activityKind[event.kind].label}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {activityDocument(workspace, event).label}
                      </span>
                    </span>
                  </span>
                ),
              },
              {
                id: 'detail',
                header: 'Detalle',
                secondary: true,
                className: 'text-muted-foreground max-w-56 truncate text-sm',
                cell: (event) => event.summary,
              },
              {
                id: 'actor',
                header: 'Quién',
                secondary: true,
                cell: (event) => (
                  <Tag tone={event.actorId ? 'gray' : 'purple'}>{actorName(workspace, event)}</Tag>
                ),
              },
              {
                id: 'at',
                header: 'Cuándo',
                align: 'right',
                className: 'text-muted-foreground text-sm tabular-nums',
                cell: (event) => formatDateTime(event.at),
              },
            ]}
          />
        )}
      </Panel>
    </>
  )
}
