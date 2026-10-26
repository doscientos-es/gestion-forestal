import { DropdownMenuItem, cn } from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { Plus, UserX } from 'lucide-react'

import { lookup, type Assignment, type Workspace } from '@/features/workspace'
import type { IsoDate } from '@/shared/lib/dates'
import { formatShortDate } from '@/shared/lib/format'
import { RowMenu } from '@/shared/ui/data-table'

import { agendaSegments, type BoardRow } from '../application/schedule-board'

const dot: Record<string, string> = {
  green: 'bg-[#15803d]',
  blue: 'bg-[#2563eb]',
  amber: 'bg-[#d97706]',
}

const range = (start: IsoDate, end: IsoDate) =>
  start === end ? formatShortDate(start) : `${formatShortDate(start)} – ${formatShortDate(end)}`

/** Phone version of the board: one card per crew with its works and free periods as a list. */
export function ScheduleAgenda({
  workspace,
  rows,
  onAssign,
  onMove,
  onRemove,
}: {
  workspace: Workspace
  rows: BoardRow[]
  onAssign: (crewId: string, date: IsoDate) => void
  onMove: (assignment: Assignment) => void
  onRemove: (assignment: Assignment) => void
}) {
  const find = lookup(workspace)
  const navigate = useNavigate()
  return (
    <ul className="divide-border divide-y">
      {rows.map((row) => {
        const crew = find.crew(row.crewId)
        return (
          <li key={row.crewId} className="px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span
                aria-hidden="true"
                className={cn('size-2.5 rounded-full', dot[crew?.tone ?? 'green'])}
              />
              {crew?.name}
              <span className="text-muted-foreground text-xs font-normal">
                {find.person(crew?.foremanId ?? '')?.name}
              </span>
            </p>
            <ul className="mt-2 space-y-1.5">
              {agendaSegments(row.cells).map((segment) => {
                const first = segment.cells[0]
                const last = segment.cells.at(-1)
                if (!first || !last) return null
                if (segment.kind === 'free') {
                  return (
                    <li key={first.date}>
                      <button
                        type="button"
                        onClick={() => onAssign(row.crewId, first.date)}
                        className="text-muted-foreground border-border flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-left text-xs"
                      >
                        <Plus aria-hidden="true" className="size-3.5" />
                        Libre {range(first.date, last.date)} · asignar obra
                      </button>
                    </li>
                  )
                }
                const work = find.work(segment.assignment.workId)
                if (!work) return null
                const absent = Math.max(...segment.cells.map((cell) => cell.absences.length))
                return (
                  <li
                    key={segment.assignment.id}
                    className="bg-muted/60 flex items-center gap-2 rounded-lg py-1.5 pr-1 pl-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{work.title}</span>
                      <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        {range(first.date, last.date)}
                        {absent > 0 ? (
                          <>
                            <UserX aria-hidden="true" className="size-3.5 text-amber-800" />
                            <span>
                              {absent} ausente{absent === 1 ? '' : 's'}
                            </span>
                          </>
                        ) : null}
                      </span>
                    </span>
                    <RowMenu label={`Acciones de ${work.title} en ${crew?.name}`}>
                      <DropdownMenuItem
                        onAction={() =>
                          void navigate({ to: '/obras/$workId', params: { workId: work.id } })
                        }
                      >
                        Abrir obra
                      </DropdownMenuItem>
                      <DropdownMenuItem onAction={() => onMove(segment.assignment)}>
                        Mover o cambiar de cuadrilla
                      </DropdownMenuItem>
                      <DropdownMenuItem onAction={() => onRemove(segment.assignment)}>
                        Quitar de la planificación
                      </DropdownMenuItem>
                    </RowMenu>
                  </li>
                )
              })}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}
