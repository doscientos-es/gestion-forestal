import { Button, DropdownMenu, DropdownMenuItem } from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { Download, History } from 'lucide-react'
import { useState } from 'react'

import { useWorkspace, type Assignment } from '@/features/workspace'
import { downloadTextFile } from '@/shared/lib/download'
import { formatNumber, formatShortDate } from '@/shared/lib/format'
import { useUrlState, useUrlText } from '@/shared/lib/use-url-state'
import { DataTable, RowMenu } from '@/shared/ui/data-table'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { FilterTabs, FilterToolbar, SearchField, type FilterOption } from '@/shared/ui/filter-tabs'
import { ChoiceField } from '@/shared/ui/form-controls'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

import { assignmentsToCsv, reportsToCsv } from '../application/plan-export'
import {
  assignmentStatusLabel,
  type AssignmentRecord,
  type AssignmentStatus,
} from '../application/plan-records'

type StatusFilter = AssignmentStatus | 'todas'
const tones = { planificada: 'blue', en_curso: 'green', terminada: 'gray' } as const
const tabLabels = { planificada: 'Planificadas', en_curso: 'En curso', terminada: 'Terminadas' }

/** History of every assignment with filters and CSV downloads (what the filters show is what you get). */
export function AssignmentsList({
  records,
  today,
  onMove,
  onRemove,
}: {
  records: AssignmentRecord[]
  today: string
  onMove: (assignment: Assignment) => void
  onRemove: (assignment: Assignment) => void
}) {
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const [status, setStatus] = useUrlState<StatusFilter>('estado', 'todas', [
    'todas',
    'planificada',
    'en_curso',
    'terminada',
  ])
  const [crewId, setCrewId] = useState('todas')
  const [query, setQuery] = useUrlText('q')
  const text = query.trim().toLowerCase()
  const matches = (record: AssignmentRecord, wanted: StatusFilter) =>
    (wanted === 'todas' || record.status === wanted) &&
    (crewId === 'todas' || record.assignment.crewId === crewId) &&
    (!text ||
      `${record.work.code} ${record.work.title} ${record.clientName}`.toLowerCase().includes(text))
  const visible = records.filter((record) => matches(record, status))
  const options: FilterOption<StatusFilter>[] = [
    { value: 'todas', label: 'Todas', count: records.filter((r) => matches(r, 'todas')).length },
    ...(['planificada', 'en_curso', 'terminada'] as const).map((value) => ({
      value,
      label: tabLabels[value],
      count: records.filter((r) => matches(r, value)).length,
    })),
  ]
  const download = (kind: 'asignaciones' | 'partes') => {
    const csv =
      kind === 'asignaciones' ? assignmentsToCsv(visible) : reportsToCsv(workspace, visible)
    downloadTextFile(`${kind}-${today}.csv`, csv)
  }

  return (
    <>
      <FilterToolbar
        tabs={
          <FilterTabs
            label="Filtrar por estado"
            options={options}
            value={status}
            onChange={setStatus}
          />
        }
      >
        <ChoiceField
          hideLabel
          className="w-44 shrink-0"
          label="Cuadrilla"
          value={crewId}
          onChange={setCrewId}
          options={[
            { value: 'todas', label: 'Todas las cuadrillas' },
            ...workspace.crews.map((crew) => ({ value: crew.id, label: crew.name })),
          ]}
        />
        <SearchField
          label="Buscar asignaciones"
          value={query}
          onChange={setQuery}
          placeholder="Código, obra o cliente"
        />
      </FilterToolbar>
      <Panel aria-labelledby="records-title">
        <PanelHeader
          id="records-title"
          icon={<History className="size-5" strokeWidth={1.75} />}
          title="Histórico de asignaciones"
          meta={formatNumber(visible.length)}
          action={
            <DropdownMenu
              placement="bottom end"
              trigger={
                <Button variant="outline" size="sm" isDisabled={visible.length === 0}>
                  <Download aria-hidden="true" className="size-4" /> Descargar CSV
                </Button>
              }
            >
              <DropdownMenuItem onAction={() => download('asignaciones')}>
                Asignaciones ({visible.length})
              </DropdownMenuItem>
              <DropdownMenuItem onAction={() => download('partes')}>
                Partes diarios de estas asignaciones
              </DropdownMenuItem>
            </DropdownMenu>
          }
        />
        {visible.length === 0 ? (
          <EmptyPanel
            icon={<History className="size-5" />}
            title="No hay asignaciones con estos filtros"
            description="Cambia el estado, la cuadrilla o la búsqueda."
          />
        ) : (
          <DataTable
            label="Asignaciones"
            rows={visible}
            getKey={(row) => row.assignment.id}
            openLabel={(row) => `Abrir obra ${row.work.code}, ${row.work.title}`}
            onOpen={(row) =>
              void navigate({ to: '/obras/$workId', params: { workId: row.work.id } })
            }
            columns={[
              {
                id: 'work',
                header: 'Obra',
                cell: (row) => (
                  <>
                    <span className="block truncate text-sm font-semibold">{row.work.title}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {row.work.code} · {row.clientName}
                    </span>
                  </>
                ),
              },
              { id: 'crew', header: 'Cuadrilla', secondary: true, cell: (row) => row.crewName },
              {
                id: 'dates',
                header: 'Fechas',
                className: 'text-sm tabular-nums',
                cell: (row) =>
                  `${formatShortDate(row.assignment.start)} – ${formatShortDate(row.assignment.end)}`,
              },
              {
                id: 'plants',
                header: 'Plantas',
                secondary: true,
                align: 'right',
                className: 'text-sm tabular-nums',
                cell: (row) => formatNumber(row.actualPlants),
              },
              {
                id: 'status',
                header: 'Estado',
                cell: (row) => (
                  <Tag tone={tones[row.status]} dot>
                    {assignmentStatusLabel[row.status]}
                  </Tag>
                ),
              },
            ]}
            actions={(row) => (
              <RowMenu label={`Acciones de ${row.work.code} en ${row.crewName}`}>
                <DropdownMenuItem onAction={() => onMove(row.assignment)}>
                  Mover o cambiar de cuadrilla
                </DropdownMenuItem>
                <DropdownMenuItem onAction={() => onRemove(row.assignment)}>
                  Quitar de la planificación
                </DropdownMenuItem>
              </RowMenu>
            )}
          />
        )}
      </Panel>
    </>
  )
}
