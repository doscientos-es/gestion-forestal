import { Button, MetricCard, MetricGrid } from '@doscientos/ui'
import { Check, Plus, Sun, X } from 'lucide-react'
import { useState } from 'react'

import {
  absenceStatus,
  absenceImpact,
  absenceType,
  absenceWorkingDays,
  lookup,
  useCurrentUser,
  useWorkspace,
  vacationBalance,
  type Absence,
  type AbsenceStatus,
} from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { rangesOverlap } from '@/shared/lib/dates'
import { formatShortDate } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { FilterTabs } from '@/shared/ui/filter-tabs'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

import { absencesApi } from '../api'
import { AbsenceRequestDialog } from './absence-request-dialog'
import { MonthCalendar } from './month-calendar'
import { VacationBalances } from './vacation-balances'

type Filter = 'todas' | AbsenceStatus
type View = 'solicitudes' | 'calendario' | 'saldos'

export function AbsencesPage() {
  const workspace = useWorkspace()
  const user = useCurrentUser()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('solicitada')
  const [view, setView] = useState<View>('solicitudes')
  const decide = useCommand(
    ({ absence, status }: { absence: Absence; status: 'aprobada' | 'rechazada' }) =>
      absencesApi.decide(absence.id, status),
    {
      success: (_output, { absence, status }) => ({
        title: status === 'aprobada' ? 'Ausencia aprobada' : 'Solicitud rechazada',
        description: workspace.people.find((person) => person.id === absence.personId)?.name ?? '',
      }),
    },
  )
  if (!user) return null
  const find = lookup(workspace)
  const isAdmin = user.role === 'admin'
  const canCalendar = isAdmin || user.role === 'capataz'
  const today = clock.today()
  const year = Number(today.slice(0, 4))
  const scope = isAdmin
    ? workspace.absences
    : workspace.absences.filter((item) => item.personId === user.id)
  const effectiveFilter: Filter = isAdmin ? filter : 'todas'
  const rows = scope
    .filter((item) => effectiveFilter === 'todas' || item.status === effectiveFilter)
    .sort((a, b) => b.start.localeCompare(a.start))
  const count = (value: Filter) =>
    scope.filter((item) => value === 'todas' || item.status === value).length
  const balance = vacationBalance(user.id, year, workspace.absences)
  const upcoming = scope.filter((item) => item.status !== 'rechazada' && item.end >= today).length
  const balances = workspace.people.filter((person) => person.role !== 'admin').length

  return (
    <>
      <PageTop
        title="Vacaciones y ausencias"
        description={
          isAdmin
            ? 'Aprueba solicitudes viendo si afectan a obras planificadas.'
            : 'Pide días y consulta tu saldo del año.'
        }
        actions={
          <Button className="h-11 px-5" onPress={() => setOpen(true)}>
            <Plus aria-hidden="true" className="size-4" />{' '}
            {isAdmin ? 'Registrar ausencia' : 'Pedir días'}
          </Button>
        }
      />
      {!isAdmin ? (
        <MetricGrid className="mb-5 grid gap-3 sm:grid-cols-3">
          <MetricCard
            label={`Vacaciones ${year}`}
            value={`${balance.remaining} días`}
            description={`Disponibles de ${balance.total}`}
          />
          <MetricCard
            label="Disfrutados o aprobados"
            value={`${balance.used} días`}
            description="Laborables"
          />
          <MetricCard
            label="Próximas ausencias"
            value={upcoming}
            description="Solicitadas o aprobadas"
          />
        </MetricGrid>
      ) : null}
      {canCalendar ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <FilterTabs
            label="Vista de ausencias"
            value={view}
            onChange={setView}
            options={[
              {
                value: 'solicitudes',
                label: isAdmin ? 'Solicitudes' : 'Mis solicitudes',
                count: count('solicitada'),
              },
              { value: 'calendario', label: 'Calendario', count: upcoming },
              ...(isAdmin ? [{ value: 'saldos' as const, label: 'Saldos', count: balances }] : []),
            ]}
          />
          {isAdmin && view === 'solicitudes' ? (
            <FilterTabs
              label="Filtrar por estado"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'solicitada', label: 'Pendientes', count: count('solicitada') },
                { value: 'aprobada', label: 'Aprobadas', count: count('aprobada') },
                { value: 'rechazada', label: 'Rechazadas', count: count('rechazada') },
                { value: 'todas', label: 'Todas', count: count('todas') },
              ]}
            />
          ) : null}
        </div>
      ) : null}
      {canCalendar && view === 'calendario' ? (
        <MonthCalendar
          {...(isAdmin || !user.crewId ? {} : { crewId: user.crewId })}
          canDecide={isAdmin}
        />
      ) : null}
      {isAdmin && view === 'saldos' ? <VacationBalances /> : null}
      <Panel
        aria-labelledby="absences-title"
        className={canCalendar && view !== 'solicitudes' ? 'hidden' : undefined}
      >
        <PanelHeader
          id="absences-title"
          icon={<Sun className="size-5" strokeWidth={1.75} />}
          title={isAdmin ? 'Solicitudes del equipo' : 'Mis solicitudes'}
          meta={rows.length}
        />
        {rows.length === 0 ? (
          <EmptyPanel
            icon={<Sun className="size-5" />}
            title={isAdmin ? 'No hay solicitudes en esta vista' : 'Aún no has pedido días'}
            description={
              isAdmin
                ? 'Cambia el filtro para ver el histórico.'
                : 'Pide vacaciones o un permiso y la oficina lo aprobará.'
            }
            action={
              !isAdmin ? (
                <Button variant="outline" onPress={() => setOpen(true)}>
                  Pedir días
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-border divide-y">
            {rows.map((absence) => {
              const person = find.person(absence.personId)
              const status = absenceStatus[absence.status]
              const impact = absenceImpact(absence, workspace)
              const conflicts = workspace.assignments.filter(
                (item) =>
                  item.crewId === person?.crewId &&
                  rangesOverlap(item.start, item.end, absence.start, absence.end),
              )
              return (
                <li key={absence.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {isAdmin ? `${person?.name} · ` : ''}
                      {absenceType[absence.type]}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatShortDate(absence.start)} – {formatShortDate(absence.end)} ·{' '}
                      {absenceWorkingDays(absence)} días
                      {absence.note ? ` · ${absence.note}` : ''}
                    </p>
                    {isAdmin && conflicts.length > 0 && absence.status !== 'rechazada' ? (
                      <p className="mt-1 text-xs text-amber-800">
                        Coincide con{' '}
                        {conflicts.map((item) => find.work(item.workId)?.title).join(', ')}
                      </p>
                    ) : null}
                    {isAdmin &&
                    impact &&
                    absence.status === 'solicitada' &&
                    impact.overlapping.length > 0 ? (
                      <p className="mt-1 text-xs text-amber-800">
                        También fuera:{' '}
                        {impact.overlapping.map((item) => item.person.name).join(', ')}
                        {' · '}
                        {impact.understaffed
                          ? `la cuadrilla se queda con ${impact.minAvailable} de ${impact.crewSize}`
                          : `quedan ${impact.minAvailable} de ${impact.crewSize}`}
                      </p>
                    ) : null}
                  </div>
                  <Tag tone={status.tone} dot>
                    {status.label}
                  </Tag>
                  {isAdmin && absence.status === 'solicitada' ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => decide.mutate({ absence, status: 'rechazada' })}
                      >
                        <X aria-hidden="true" className="size-4" /> Rechazar
                        <span className="sr-only"> solicitud de {person?.name}</span>
                      </Button>
                      <Button
                        size="sm"
                        onPress={() => decide.mutate({ absence, status: 'aprobada' })}
                      >
                        <Check aria-hidden="true" className="size-4" /> Aprobar
                      </Button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
      {open ? <AbsenceRequestDialog open onOpenChange={setOpen} user={user} /> : null}
    </>
  )
}
