import { Button, IconButton, cn } from '@doscientos/ui'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import {
  absenceType,
  monthGrid,
  useWorkspace,
  type Absence,
  type GridDay,
} from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { formatMonthYear, formatShortDate, formatWeekday, pluralize } from '@/shared/lib/format'
import { ChoiceField } from '@/shared/ui/form-controls'
import { Panel, PanelHeader } from '@/shared/ui/surface'

import { CalendarDayDetail } from './calendar-day-detail'

const typeColor: Record<Absence['type'], string> = {
  vacaciones: 'bg-emerald-500 text-white',
  baja: 'bg-rose-500 text-white',
  permiso: 'bg-sky-500 text-white',
}
const dotColor: Record<Absence['type'], string> = {
  vacaciones: 'bg-emerald-500',
  baja: 'bg-rose-500',
  permiso: 'bg-sky-500',
}
const loadTint = { libre: '', varios: 'bg-amber-50', critico: 'bg-red-50' } as const
const MAX_CHIPS = 2
/** A Monday, only used to print the weekday names. */
const WEEKDAY_SAMPLE = [
  '2026-01-05',
  '2026-01-06',
  '2026-01-07',
  '2026-01-08',
  '2026-01-09',
  '2026-01-10',
  '2026-01-11',
]

function dayLabel(day: GridDay) {
  const base = `${formatShortDate(day.date)}`
  if (day.away.length === 0) return `${base}: nadie fuera`
  const names = day.away.map((item) => item.person.name).join(', ')
  const load =
    day.load === 'critico'
      ? '. Cuadrilla al límite'
      : day.load === 'varios'
        ? '. Varias personas fuera'
        : ''
  return `${base}: ${pluralize(day.away.length, 'persona fuera', 'personas fuera')} (${names})${load}`
}

/**
 * Month grid of who is away. `crewId` locks it to one crew (the foreman's); without it the
 * office can filter by crew. Click a day for details and, for the office, to approve requests.
 */
export function MonthCalendar({
  crewId,
  canDecide,
  onRegister,
  onCancel,
}: {
  crewId?: string
  canDecide: boolean
  onRegister?: (date: string) => void
  onCancel?: (absence: Absence) => void
}) {
  const workspace = useWorkspace()
  const today = clock.today()
  const [view, setView] = useState({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)),
  })
  const [filter, setFilter] = useState('todas')
  const [selected, setSelected] = useState<string | null>(today)
  const crewIds = crewId
    ? [crewId]
    : filter === 'todas'
      ? workspace.crews.map((c) => c.id)
      : [filter]
  const weeks = monthGrid(view.year, view.month, crewIds, workspace)
  const day = weeks.flat().find((item) => item.date === selected && item.inMonth)
  const pending = weeks
    .flat()
    .filter((item) => item.inMonth)
    .flatMap((item) => item.away)
    .filter((item) => item.absence.status === 'solicitada')
  const pendingCount = new Set(pending.map((item) => item.absence.id)).size
  const shift = (delta: number) => {
    setSelected(null)
    setView(({ year, month }) => {
      const index = year * 12 + (month - 1) + delta
      return { year: Math.floor(index / 12), month: (index % 12) + 1 }
    })
  }
  // «octubre de 2026» → «Octubre de 2026» (CSS `capitalize` would also turn «de» into «De»).
  const rawTitle = formatMonthYear(view.year, view.month)
  const monthTitle = rawTitle.charAt(0).toLocaleUpperCase('es') + rawTitle.slice(1)

  return (
    <>
      <Panel aria-labelledby="calendar-title">
        <PanelHeader
          id="calendar-title"
          icon={<CalendarDays className="size-5" strokeWidth={1.75} />}
          title={monthTitle}
          description={
            pendingCount > 0
              ? `${pluralize(pendingCount, 'solicitud pendiente', 'solicitudes pendientes')} este mes`
              : 'Quién está fuera cada día.'
          }
          action={
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onPress={() => {
                  setView({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) })
                  setSelected(today)
                }}
              >
                Hoy
              </Button>
              <IconButton
                label="Mes anterior"
                variant="outline"
                size="icon-sm"
                onPress={() => shift(-1)}
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </IconButton>
              <IconButton
                label="Mes siguiente"
                variant="outline"
                size="icon-sm"
                onPress={() => shift(1)}
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </IconButton>
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 py-3">
          {crewId ? null : (
            <ChoiceField
              hideLabel
              className="w-48"
              label="Cuadrilla"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'todas', label: 'Todas las cuadrillas' },
                ...workspace.crews.map((crew) => ({ value: crew.id, label: crew.name })),
              ]}
            />
          )}
          <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {(Object.keys(typeColor) as Absence['type'][]).map((type) => (
              <li key={type} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn('size-2.5 rounded-full', dotColor[type])} />
                {absenceType[type]}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full border border-dashed border-zinc-500"
              />
              Pendiente
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-sm bg-amber-200" />
              Varios fuera
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-sm bg-red-200" />
              Cuadrilla al límite
            </li>
          </ul>
        </div>
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">
            Ausencias de {formatMonthYear(view.year, view.month)}
          </caption>
          <thead>
            <tr>
              {WEEKDAY_SAMPLE.map((date) => (
                <th
                  key={date}
                  scope="col"
                  className="text-muted-foreground py-2 text-xs font-medium uppercase"
                >
                  {formatWeekday(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0]?.date}>
                {week.map((cell) => (
                  <td
                    key={cell.date}
                    className="border-border border-t border-l p-0 first:border-l-0"
                  >
                    <button
                      type="button"
                      aria-label={dayLabel(cell)}
                      aria-pressed={selected === cell.date}
                      disabled={!cell.inMonth}
                      onClick={() => setSelected(cell.date)}
                      className={cn(
                        'cal-day focus-visible:outline-ring flex w-full flex-col items-stretch gap-1 p-1.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2',
                        cell.inMonth ? 'hover:bg-muted/60 cursor-pointer' : 'opacity-30',
                        cell.inMonth && loadTint[cell.load],
                        cell.weekend && cell.load === 'libre' && 'bg-muted/40',
                        selected === cell.date && cell.inMonth && 'ring-brand ring-2 ring-inset',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
                          cell.date === today
                            ? 'bg-brand font-semibold text-white'
                            : 'text-muted-foreground',
                        )}
                      >
                        {Number(cell.date.slice(8))}
                      </span>
                      <span aria-hidden="true" className="cal-chips">
                        {cell.away.slice(0, MAX_CHIPS).map(({ absence, person }) => (
                          <span
                            key={absence.id}
                            className={cn(
                              'truncate rounded px-1.5 py-0.5 text-[0.6875rem] leading-tight font-medium',
                              typeColor[absence.type],
                              absence.status === 'solicitada' &&
                                'border border-dashed border-current bg-white/70! text-zinc-700!',
                            )}
                          >
                            {person.name.split(' ')[0]}
                          </span>
                        ))}
                        {cell.away.length > MAX_CHIPS ? (
                          <span className="text-muted-foreground px-1 text-[0.6875rem]">
                            +{cell.away.length - MAX_CHIPS} más
                          </span>
                        ) : null}
                      </span>
                      <span aria-hidden="true" className="cal-dots">
                        {cell.away.slice(0, 6).map(({ absence }) => (
                          <span
                            key={absence.id}
                            className={cn('size-2 rounded-full', dotColor[absence.type])}
                          />
                        ))}
                      </span>
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {day ? (
        <CalendarDayDetail
          day={day}
          canDecide={canDecide}
          {...(onRegister ? { onRegister } : {})}
          {...(onCancel ? { onCancel } : {})}
        />
      ) : (
        <p className="text-muted-foreground mt-4 text-center text-sm">
          Pulsa un día para ver quién está fuera.
        </p>
      )}
    </>
  )
}
