import { DropdownMenuItem } from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { TreePine } from 'lucide-react'
import { useState } from 'react'

import {
  availableYears,
  lookup,
  useCurrentUser,
  useWorkspace,
  workStatus,
  zoneTone,
} from '@/features/workspace'
import { formatMoney, formatNumber, formatPercent } from '@/shared/lib/format'
import { DataTable, RowMenu } from '@/shared/ui/data-table'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { FilterTabs, FilterToolbar, SearchField, type FilterOption } from '@/shared/ui/filter-tabs'
import { ChoiceField } from '@/shared/ui/form-controls'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader, ProgressBar, Tag } from '@/shared/ui/surface'

import { filterRows, workRows, type WorkFilter } from '../application/work-list'
import { YieldDeviation } from './deviation'

export function WorkListPage() {
  const workspace = useWorkspace()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const open = (workId: string) => void navigate({ to: '/obras/$workId', params: { workId } })
  const years = availableYears(workspace)
  const [filter, setFilter] = useState<WorkFilter>('activas')
  const [query, setQuery] = useState('')
  const [year, setYear] = useState<number | 'todos'>('todos')
  if (!user) return null
  const find = lookup(workspace)
  const rows = workRows(workspace, user)
  const visible = filterRows(rows, filter, query, year)
  const count = (value: WorkFilter) => filterRows(rows, value, '', year).length
  const options: FilterOption<WorkFilter>[] = [
    { value: 'activas', label: 'Activas', count: count('activas') },
    { value: 'en_curso', label: 'En curso', count: count('en_curso') },
    { value: 'pendiente', label: 'Sin planificar', count: count('pendiente') },
    { value: 'terminada', label: 'Por facturar', count: count('terminada') },
    { value: 'todas', label: 'Todas', count: count('todas') },
  ]
  const isAdmin = user.role === 'admin'
  const totalPrice = visible.reduce((sum, row) => sum + row.work.planned.price, 0)

  return (
    <>
      <PageTop
        title="Obras"
        description={
          isAdmin
            ? 'Cada obra nace de un presupuesto aceptado y se compara con sus partes reales.'
            : 'Obras asignadas a tu cuadrilla.'
        }
      />
      <FilterToolbar
        tabs={
          <FilterTabs label="Filtrar obras" options={options} value={filter} onChange={setFilter} />
        }
      >
        <ChoiceField
          hideLabel
          className="w-40 shrink-0"
          label="Campaña"
          value={String(year)}
          onChange={(value) => setYear(value === 'todos' ? 'todos' : Number(value))}
          options={[
            { value: 'todos', label: 'Todos los años' },
            ...years.map((item) => ({ value: String(item), label: `Campaña ${item}` })),
          ]}
        />
        <SearchField
          label="Buscar obras"
          value={query}
          onChange={setQuery}
          placeholder="Código u obra"
        />
      </FilterToolbar>
      <Panel aria-labelledby="works-title">
        <PanelHeader
          id="works-title"
          icon={<TreePine className="size-5" strokeWidth={1.75} />}
          title="Obras"
          meta={formatNumber(visible.length)}
        />
        {visible.length === 0 ? (
          <EmptyPanel
            icon={<TreePine className="size-5" />}
            title="No hay obras en esta vista"
            description="Cambia el filtro o la campaña para ver más obras."
          />
        ) : (
          <DataTable
            label="Obras"
            rows={visible}
            getKey={(row) => row.work.id}
            openLabel={(row) => `Abrir obra ${row.work.code}, ${row.work.title}`}
            onOpen={(row) => open(row.work.id)}
            footer={
              isAdmin ? (
                <span>
                  Importe presupuestado{' '}
                  <span className="text-foreground font-semibold tabular-nums">
                    {formatMoney(totalPrice)}
                  </span>
                </span>
              ) : undefined
            }
            columns={[
              {
                id: 'title',
                header: 'Obra',
                cell: ({ work, crewIds }) => (
                  <>
                    <span className="block truncate text-sm font-semibold">{work.title}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {work.code} · {find.client(work.clientId)?.name} ·{' '}
                      {crewIds.map((id) => find.crew(id)?.name).join(', ') || 'Sin cuadrilla'}
                    </span>
                  </>
                ),
              },
              {
                id: 'zone',
                header: 'Zona',
                secondary: true,
                cell: ({ work }) => {
                  const zone = find.zone(work.zoneId)
                  return zone ? <Tag tone={zoneTone(zone.id, workspace)}>{zone.name}</Tag> : null
                },
              },
              {
                id: 'progress',
                header: 'Avance',
                className: 'min-w-36',
                cell: ({ work, performance }) => (
                  <span className="flex items-center gap-2">
                    <ProgressBar value={performance.progress} label={`Avance de ${work.title}`} />
                    <span className="text-muted-foreground w-9 shrink-0 text-right text-xs tabular-nums">
                      {formatPercent(Math.min(performance.progress, 1))}
                    </span>
                  </span>
                ),
              },
              {
                id: 'yield',
                header: 'Rendimiento',
                secondary: true,
                cell: ({ performance }) => (
                  <YieldDeviation
                    value={performance.yieldDeviation}
                    hasData={performance.workerDays > 0}
                  />
                ),
              },
              {
                id: 'status',
                header: 'Estado',
                cell: ({ work }) => {
                  const status = workStatus[work.status]
                  return (
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  )
                },
              },
            ]}
            actions={({ work }) => (
              <RowMenu label={`Acciones de ${work.code}`}>
                <DropdownMenuItem onAction={() => open(work.id)}>Abrir</DropdownMenuItem>
                {isAdmin ? (
                  <DropdownMenuItem
                    onAction={() =>
                      void navigate({
                        to: '/presupuestos/$budgetId',
                        params: { budgetId: work.budgetId },
                      })
                    }
                  >
                    Ver presupuesto
                  </DropdownMenuItem>
                ) : null}
              </RowMenu>
            )}
          />
        )}
      </Panel>
    </>
  )
}
