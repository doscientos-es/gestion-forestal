import { Button } from '@doscientos/ui'
import { Check, X } from 'lucide-react'

import {
  absenceImpact,
  absenceStatus,
  absenceType,
  absenceWorkingDays,
  useWorkspace,
  type Absence,
  type GridDay,
} from '@/features/workspace'
import { formatLongDate, formatShortDate } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

import { absencesApi } from '../api'

/** Who is away on the chosen day, with the impact on the crew and approve/reject for the office. */
export function CalendarDayDetail({ day, canDecide }: { day: GridDay; canDecide: boolean }) {
  const workspace = useWorkspace()
  const decide = useCommand(
    ({ absence, status }: { absence: Absence; status: 'aprobada' | 'rechazada' }) =>
      absencesApi.decide(absence.id, status),
    {
      success: (_output, { status }) => ({
        title: status === 'aprobada' ? 'Ausencia aprobada' : 'Solicitud rechazada',
      }),
    },
  )
  const crewName = (crewId: string | null) =>
    workspace.crews.find((crew) => crew.id === crewId)?.name ?? ''

  return (
    <Panel aria-labelledby="day-title" className="mt-4">
      <PanelHeader
        id="day-title"
        title={<span className="capitalize">{formatLongDate(day.date)}</span>}
        description={
          day.away.length === 0
            ? 'Nadie fuera este día.'
            : day.load === 'critico'
              ? 'Hay una cuadrilla al límite: conviene no aprobar más ausencias.'
              : day.load === 'varios'
                ? 'Hay varias personas de una misma cuadrilla fuera.'
                : undefined
        }
        meta={day.away.length}
      />
      <ul className="divide-border divide-y">
        {day.away.map(({ absence, person }) => {
          const impact = absenceImpact(absence, workspace)
          const status = absenceStatus[absence.status]
          return (
            <li key={absence.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {person.name} · {absenceType[absence.type]}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {crewName(person.crewId)} · {formatShortDate(absence.start)} –{' '}
                  {formatShortDate(absence.end)} · {absenceWorkingDays(absence)} días
                  {impact && impact.overlapping.length > 0
                    ? ` · coincide con ${impact.overlapping.map((item) => item.person.name.split(' ')[0]).join(', ')}`
                    : ''}
                </span>
              </span>
              <Tag tone={status.tone} dot>
                {status.label}
              </Tag>
              {canDecide && absence.status === 'solicitada' ? (
                <span className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    isDisabled={decide.isPending}
                    onPress={() => decide.mutate({ absence, status: 'rechazada' })}
                  >
                    <X aria-hidden="true" className="size-4" /> Rechazar
                    <span className="sr-only"> solicitud de {person.name}</span>
                  </Button>
                  <Button
                    size="sm"
                    isDisabled={decide.isPending}
                    onPress={() => decide.mutate({ absence, status: 'aprobada' })}
                  >
                    <Check aria-hidden="true" className="size-4" /> Aprobar
                  </Button>
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
