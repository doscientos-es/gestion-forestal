import { Button, DropdownMenuItem, Tooltip, cn } from '@doscientos/ui'
import { Link, useNavigate } from '@tanstack/react-router'
import { UserX, Users } from 'lucide-react'

import {
  absenceType,
  crewMembers,
  lookup,
  type Absence,
  type Assignment,
  type Workspace,
} from '@/features/workspace'
import { weekday, type IsoDate } from '@/shared/lib/dates'
import { formatShortDate, formatWeekday } from '@/shared/lib/format'
import { RowMenu } from '@/shared/ui/data-table'

import { boardSegments, type BoardRow } from '../application/schedule-board'

const crewTone: Record<string, string> = {
  green: 'bg-[#e9f6ee] text-[#14532d] border-[#cbe8d6]',
  blue: 'bg-[#e8f0fd] text-[#1e40af] border-[#cfdffa]',
  amber: 'bg-[#fdf1dc] text-[#7a4a05] border-[#f4dcae]',
}

export function ScheduleBoard({
  workspace,
  days,
  rows,
  today,
  onAssign,
  onMove,
  onRemove,
}: {
  workspace: Workspace
  days: IsoDate[]
  rows: BoardRow[]
  today: IsoDate
  onAssign: (crewId: string, date: IsoDate) => void
  onMove: (assignment: Assignment) => void
  onRemove: (assignment: Assignment) => void
}) {
  const find = lookup(workspace)
  const navigate = useNavigate()
  /** Monday of a week after the first one shown: a faint line separates the weeks. */
  const weekStart = (date: IsoDate | undefined) =>
    date !== undefined && date !== days[0] && weekday(date) === 1
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-md table-fixed border-separate border-spacing-0 text-sm md:min-w-176">
        <caption className="sr-only">Planificación por cuadrilla y día laborable</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="bg-card sticky left-0 z-10 w-24 px-3 py-3 text-left text-xs font-medium md:w-44 md:px-5"
            >
              Cuadrilla
            </th>
            {days.map((date) => (
              <th
                key={date}
                scope="col"
                className={cn(
                  'px-1 py-3 text-center text-xs font-medium',
                  date === today && 'text-brand bg-brand-soft/30',
                  weekStart(date) && 'border-border border-l',
                )}
              >
                <span className="text-muted-foreground block text-[0.6875rem] uppercase">
                  {formatWeekday(date)}
                </span>
                {formatShortDate(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const crew = find.crew(row.crewId)
            const tone = crewTone[crew?.tone ?? 'green']
            return (
              <tr key={row.crewId}>
                <th
                  scope="row"
                  className="bg-card border-border sticky left-0 z-10 border-t px-3 py-3 text-left font-normal md:px-5"
                >
                  <span className="line-clamp-2 text-sm leading-tight font-semibold">
                    {crew?.name}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                    {find.person(crew?.foremanId ?? '')?.name}
                  </span>
                </th>
                {boardSegments(row.cells).map((segment) => {
                  if (segment.kind === 'free') {
                    const { cell } = segment
                    return (
                      <td
                        key={cell.date}
                        className={cn(
                          'border-border h-24 border-t p-1 align-top',
                          cell.date === today && 'bg-brand-soft/30',
                          weekStart(cell.date) && 'border-l',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onAssign(row.crewId, cell.date)}
                          className="text-muted-foreground hover:border-border hover:bg-muted/60 focus-visible:outline-ring flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed border-transparent text-xs focus-visible:outline-2"
                          aria-label={`Asignar obra a ${crew?.name} el ${formatShortDate(cell.date)}`}
                        >
                          Libre
                        </button>
                      </td>
                    )
                  }
                  const { assignment, cells } = segment
                  const work = find.work(assignment.workId)
                  if (!work) return null
                  const absent = new Map(
                    cells.flatMap((cell) =>
                      cell.absences.map(({ personId, absence }) => [
                        personId,
                        `${find.person(personId)?.name} (${absenceType[absence.type].toLowerCase()})`,
                      ]),
                    ),
                  )
                  const absentById = new Map<string, Absence>(
                    cells.flatMap((cell) =>
                      cell.absences.map(({ personId, absence }) => [personId, absence] as const),
                    ),
                  )
                  const names = [...absent.values()].join(', ')
                  const minAvailable = Math.min(...cells.map((cell) => cell.available))
                  const size = cells[0]?.size ?? 0
                  return (
                    <td
                      key={cells[0]?.date}
                      colSpan={cells.length}
                      className={cn(
                        'border-border h-24 border-t p-1 align-top',
                        weekStart(cells[0]?.date) && 'border-l',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-full flex-col justify-between gap-1 rounded-xl border py-1.5 pr-1 pl-2.5 text-xs',
                          tone,
                        )}
                      >
                        <div className="flex items-start gap-1">
                          <Link
                            to="/obras/$workId"
                            params={{ workId: work.id }}
                            title={`${work.title} · ${formatShortDate(assignment.start)} – ${formatShortDate(assignment.end)}${names ? ` · Ausentes: ${names}` : ''}`}
                            className="focus-visible:outline-ring line-clamp-3 min-w-0 flex-1 pt-1 leading-tight font-semibold focus-visible:outline-2"
                          >
                            {work.title}
                          </Link>
                          <RowMenu label={`Acciones de ${work.title} en ${crew?.name}`}>
                            <DropdownMenuItem
                              onAction={() =>
                                void navigate({ to: '/obras/$workId', params: { workId: work.id } })
                              }
                            >
                              Abrir obra
                            </DropdownMenuItem>
                            <DropdownMenuItem onAction={() => onMove(assignment)}>
                              Mover o cambiar de cuadrilla
                            </DropdownMenuItem>
                            <DropdownMenuItem onAction={() => onRemove(assignment)}>
                              Quitar de la planificación
                            </DropdownMenuItem>
                          </RowMenu>
                        </div>
                        <Tooltip
                          placement="bottom start"
                          delay={150}
                          label={
                            <span className="block py-0.5">
                              <span className="mb-1 block font-semibold">
                                {crew?.name} · {formatShortDate(assignment.start)} –{' '}
                                {formatShortDate(assignment.end)}
                              </span>
                              <span className="block space-y-0.5">
                                {crewMembers(assignment.crewId, workspace.people).map((person) => {
                                  const away = absentById.get(person.id)
                                  return (
                                    <span key={person.id} className="flex items-center gap-2">
                                      <span
                                        aria-hidden="true"
                                        className={cn(
                                          'size-1.5 shrink-0 rounded-full',
                                          away ? 'bg-amber-400' : 'bg-emerald-400',
                                        )}
                                      />
                                      <span className="flex-1">{person.name}</span>
                                      <span className="opacity-70">
                                        {away
                                          ? `${absenceType[away.type]} ${formatShortDate(away.start)} – ${formatShortDate(away.end)}`
                                          : person.id === crew?.foremanId
                                            ? 'Capataz'
                                            : 'Disponible'}
                                      </span>
                                    </span>
                                  )
                                })}
                              </span>
                            </span>
                          }
                        >
                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-5 w-fit gap-1 px-1 text-xs tabular-nums"
                            aria-label={`${minAvailable} de ${size} personas disponibles como mínimo${names ? `. Ausentes: ${names}` : ''}`}
                          >
                            {absent.size > 0 ? (
                              <UserX aria-hidden="true" className="size-3.5 text-amber-800" />
                            ) : (
                              <Users aria-hidden="true" className="size-3.5" />
                            )}
                            {minAvailable}/{size}
                          </Button>
                        </Tooltip>
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
