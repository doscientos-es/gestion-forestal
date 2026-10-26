import { Badge, Button } from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { CalendarDays, ClipboardCheck, MapPin, Sun } from 'lucide-react'

import { reportContext } from '@/features/daily-report'
import {
  assignmentOn,
  crewForPerson,
  lookup,
  vacationBalance,
  type Person,
  type Workspace,
} from '@/features/workspace'
import { addDays, isWorkingDay, type IsoDate } from '@/shared/lib/dates'
import { formatNumber, formatShortDate, formatWeekday } from '@/shared/lib/format'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader } from '@/shared/ui/surface'

export function CrewHome({
  user,
  workspace,
  today,
}: {
  user: Person
  workspace: Workspace
  today: IsoDate
}) {
  const navigate = useNavigate()
  const find = lookup(workspace)
  const crew = crewForPerson(user.id, workspace.people, workspace.crews)
  const context = user.role === 'capataz' ? reportContext(workspace, user, today) : null
  const balance = vacationBalance(user.id, Number(today.slice(0, 4)), workspace.absences)
  const days = Array.from({ length: 14 }, (_, index) => addDays(today, index))
    .filter(isWorkingDay)
    .slice(0, 8)

  return (
    <>
      <PageTop
        title={`Hola, ${user.name.split(' ')[0]}`}
        description={
          crew ? `${crew.name} · capataz ${find.person(crew.foremanId)?.name}` : undefined
        }
      />
      {user.role === 'capataz' ? (
        <Panel className="mb-5 p-5">
          {context ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <MapPin aria-hidden="true" className="size-3.5" /> Hoy ·{' '}
                  {find.zone(context.work.zoneId)?.name}
                </p>
                <p className="mt-1 text-lg font-semibold">{context.work.title}</p>
                <p className="text-muted-foreground text-sm">
                  {context.existing
                    ? `Parte enviado: ${formatNumber(context.existing.plants)} plantas`
                    : `Objetivo del día: ${formatNumber(context.target)} plantas`}
                </p>
              </div>
              <Button size="lg" onPress={() => void navigate({ to: '/parte' })}>
                <ClipboardCheck aria-hidden="true" className="size-4" />{' '}
                {context.existing ? 'Revisar parte' : 'Rellenar parte'}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Hoy tu cuadrilla no tiene obra asignada.
            </p>
          )}
        </Panel>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel aria-labelledby="agenda-title">
          <PanelHeader
            id="agenda-title"
            icon={<CalendarDays className="size-5" strokeWidth={1.75} />}
            title="Próximos días"
          />
          <ul className="divide-border divide-y">
            {days.map((date) => {
              const assignment = crew
                ? assignmentOn(crew.id, date, workspace.assignments)
                : undefined
              const work = assignment ? find.work(assignment.workId) : undefined
              const absent = workspace.absences.find(
                (item) =>
                  item.personId === user.id &&
                  item.status === 'aprobada' &&
                  item.start <= date &&
                  date <= item.end,
              )
              return (
                <li key={date} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-14 text-center">
                    <span className="text-muted-foreground block text-[0.6875rem] uppercase">
                      {formatWeekday(date)}
                    </span>
                    <span className="block text-sm font-semibold">{formatShortDate(date)}</span>
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    {absent ? (
                      <Badge variant="warning" className="gap-1.5">
                        <Sun aria-hidden="true" className="size-3.5" /> Vacaciones
                      </Badge>
                    ) : work ? (
                      <>
                        <span className="block truncate font-medium">{work.title}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {find.zone(work.zoneId)?.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Sin obra asignada</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </Panel>
        <Panel className="p-5">
          <p className="text-muted-foreground text-xs">Vacaciones disponibles</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {balance.remaining} días
          </p>
          <p className="text-muted-foreground text-sm">de {balance.total} este año</p>
          <Button
            variant="outline"
            className="mt-4"
            onPress={() => void navigate({ to: '/ausencias' })}
          >
            <Sun aria-hidden="true" className="size-4" /> Pedir días
          </Button>
        </Panel>
      </div>
    </>
  )
}
