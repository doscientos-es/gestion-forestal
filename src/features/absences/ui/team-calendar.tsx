import { IconButton, cn } from '@doscientos/ui'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { absenceType, crewCalendar, useWorkspace, type Absence } from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { eachDay } from '@/shared/lib/dates'
import { formatMonthYear, formatShortDate } from '@/shared/lib/format'
import { Panel, PanelHeader } from '@/shared/ui/surface'

const typeColor: Record<Absence['type'], string> = {
  vacaciones: 'bg-emerald-500',
  baja: 'bg-rose-400',
  permiso: 'bg-sky-400',
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

/** Month view per crew: who is away each day, pending requests faded, crowded days outlined. */
export function TeamCalendar() {
  const workspace = useWorkspace()
  const today = clock.today()
  const [view, setView] = useState({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)),
  })
  const first = `${view.year}-${pad(view.month)}-01`
  const last = `${view.year}-${pad(view.month)}-${pad(new Date(view.year, view.month, 0).getDate())}`
  const days = eachDay(first, last)
  const shift = (delta: number) =>
    setView(({ year, month }) => {
      const index = year * 12 + (month - 1) + delta
      return { year: Math.floor(index / 12), month: (index % 12) + 1 }
    })

  return (
    <Panel aria-labelledby="calendar-title">
      <PanelHeader
        id="calendar-title"
        icon={<CalendarDays className="size-5" strokeWidth={1.75} />}
        title={<span className="capitalize">{formatMonthYear(view.year, view.month)}</span>}
        description="Quién está fuera cada día, por cuadrilla."
        action={
          <div className="flex gap-1">
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
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 border-b px-5 py-2 text-xs">
        {(Object.keys(typeColor) as Absence['type'][]).map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('size-2.5 rounded-sm', typeColor[type])} />
            {absenceType[type]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-zinc-400 opacity-50" />
          Pendiente de aprobar
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm ring-2 ring-amber-500" />
          Varias personas fuera
        </span>
      </div>
      <div className="overflow-x-auto">
        {workspace.crews.map((crew) => (
          <table key={crew.id} className="w-full border-collapse text-xs">
            <caption className="bg-muted/50 px-5 py-1.5 text-left font-semibold">
              {crew.name}
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-36 min-w-36 bg-white px-5 text-left font-medium"
                >
                  <span className="sr-only">Persona</span>
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    scope="col"
                    className={cn(
                      'text-muted-foreground min-w-6 pb-1 text-center font-normal tabular-nums',
                      day === today && 'text-foreground font-semibold',
                    )}
                  >
                    {Number(day.slice(8))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crewCalendar(crew.id, days, workspace).map(({ person, cells }) => (
                <tr key={person.id}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 truncate bg-white px-5 py-1 text-left font-medium"
                  >
                    {person.name}
                  </th>
                  {cells.map((cell) => (
                    <td key={cell.date} className={cn('p-px', cell.weekend && 'bg-muted/60')}>
                      {cell.absence ? (
                        <>
                          <span className="sr-only">
                            {`${absenceType[cell.absence.type]} del ${formatShortDate(cell.absence.start)} al ${formatShortDate(cell.absence.end)}${cell.absence.status === 'solicitada' ? ', pendiente' : ''}${cell.crowded ? ', coincide con otra persona de la cuadrilla' : ''}`}
                          </span>
                          <span
                            aria-hidden="true"
                            title={`${absenceType[cell.absence.type]} · ${formatShortDate(cell.absence.start)} – ${formatShortDate(cell.absence.end)}`}
                            className={cn(
                              'block h-6 rounded-sm',
                              typeColor[cell.absence.type],
                              cell.absence.status === 'solicitada' && 'opacity-50',
                              cell.crowded && 'ring-2 ring-amber-500 ring-inset',
                            )}
                          />
                        </>
                      ) : (
                        <span aria-hidden="true" className="block h-6" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </Panel>
  )
}
