import { Users } from 'lucide-react'
import { useState } from 'react'

import { availableYears, useWorkspace, workerPerformance } from '@/features/workspace'
import { formatDate, formatMoney, formatNumber, formatSignedPercent } from '@/shared/lib/format'
import { useUrlState, useUrlText } from '@/shared/lib/use-url-state'
import { DataTable } from '@/shared/ui/data-table'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { SearchField } from '@/shared/ui/filter-tabs'
import { ChoiceField } from '@/shared/ui/form-controls'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

import { WorkerDetailPanel } from './worker-detail-panel'

export function WorkerPerformancePanel() {
  const workspace = useWorkspace()
  const years = availableYears(workspace)
  const [campaign, setCampaign] = useUrlState('campana', String(years.at(-1) ?? 'todos'), [
    'todos',
    ...years.map(String),
  ])
  const [crew, setCrew] = useUrlState('equipo', 'todos', [
    'todos',
    'sin-equipo',
    ...workspace.crews.map((item) => item.id),
  ])
  const [query, setQuery] = useUrlText('trabajador')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const year = campaign === 'todos' ? null : Number(campaign)
  const rows = workerPerformance(workspace, year)
  const previousYear = year === null ? undefined : years.filter((item) => item < year).at(-1)
  const previous = previousYear === undefined ? [] : workerPerformance(workspace, previousYear)
  const visible = rows.filter(
    (row) =>
      (crew === 'todos' || (row.person.crewId ?? 'sin-equipo') === crew) &&
      row.person.name.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')),
  )
  const selected = visible.find((row) => row.person.id === selectedId)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <ChoiceField
          className="w-44"
          label="Campaña"
          value={campaign}
          onChange={setCampaign}
          options={[
            { value: 'todos', label: 'Todas las campañas' },
            ...years.map((item) => ({ value: String(item), label: `Campaña ${item}` })),
          ]}
        />
        <ChoiceField
          className="w-48"
          label="Cuadrilla actual"
          value={crew}
          onChange={setCrew}
          options={[
            { value: 'todos', label: 'Todas las cuadrillas' },
            { value: 'sin-equipo', label: 'Sin cuadrilla' },
            ...workspace.crews.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <SearchField
          label="Buscar trabajador"
          value={query}
          onChange={setQuery}
          placeholder="Nombre del trabajador"
        />
      </div>
      <Panel aria-labelledby="worker-performance-title">
        <PanelHeader
          id="worker-performance-title"
          icon={<Users className="size-5" strokeWidth={1.75} />}
          title="Actividad por trabajador"
          description="Participación real según los partes, aunque haya cambiado de cuadrilla. Abre una persona para ver sus obras y la evolución del ritmo de sus equipos."
        />
        <p className="text-muted-foreground border-border border-b px-5 py-3 text-xs">
          No hay producción individual registrada. El ritmo mostrado es el del equipo, no una
          clasificación de trabajadores.
        </p>
        {visible.length === 0 ? (
          <EmptyPanel
            icon={<Users className="size-5" />}
            title="No hay trabajadores en esta vista"
            description="Cambia la búsqueda o la cuadrilla actual."
          />
        ) : (
          <DataTable
            label="Actividad por trabajador"
            rows={visible}
            getKey={(row) => row.person.id}
            onOpen={(row) => setSelectedId(row.person.id)}
            openLabel={(row) => `Ver actividad de ${row.person.name}`}
            columns={[
              {
                id: 'person',
                header: 'Trabajador',
                cell: (row) => (
                  <>
                    <span className="block font-semibold">{row.person.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {workspace.crews.find((item) => item.id === row.person.crewId)?.name ??
                        'Sin cuadrilla actual'}
                    </span>
                  </>
                ),
              },
              {
                id: 'days',
                header: 'Días / peonadas',
                cell: (row) =>
                  row.reportCount > 0 ? (
                    <>
                      {formatNumber(row.workedDays)} / {formatNumber(row.reportCount)}
                      {row.overlappingDays > 0 ? (
                        <span className="block">
                          <Tag tone="amber">Revisar solapes</Tag>
                        </span>
                      ) : null}
                    </>
                  ) : (
                    'Sin partes'
                  ),
              },
              { id: 'works', header: 'Obras', secondary: true, cell: (row) => row.works.length },
              {
                id: 'cost',
                header: 'Coste imputado',
                cell: (row) => (row.reportCount > 0 ? formatMoney(row.laborCost) : '—'),
              },
              {
                id: 'pace',
                header: 'Ritmo del equipo vs plan',
                cell: (row) =>
                  row.teamYieldDeviation === null
                    ? '—'
                    : formatSignedPercent(row.teamYieldDeviation, 1),
              },
              {
                id: 'last',
                header: 'Último parte',
                secondary: true,
                cell: (row) => (row.lastReportOn ? formatDate(row.lastReportOn) : '—'),
              },
            ]}
            footer="Costes valorados con la tarifa diaria actual. Las incidencias se consultan en el detalle."
          />
        )}
      </Panel>
      {selected ? (
        <WorkerDetailPanel
          row={selected}
          previous={previous.find((row) => row.person.id === selected.person.id)}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </>
  )
}
