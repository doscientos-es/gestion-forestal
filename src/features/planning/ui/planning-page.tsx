import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  ButtonGroup,
  ConfirmDialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  IconButton,
  MetricCard,
  MetricGrid,
} from '@doscientos/ui'
import { CalendarRange, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { useState } from 'react'

import { lookup, useWorkspace, type Assignment, type Work } from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { addDays, nextWorkingDay, type IsoDate } from '@/shared/lib/dates'
import { formatMoney, formatNumber, formatShortDate } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { useUrlState } from '@/shared/lib/use-url-state'
import { FilterTabs, type FilterOption } from '@/shared/ui/filter-tabs'
import { ChoiceField } from '@/shared/ui/form-controls'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader } from '@/shared/ui/surface'

import { planningApi } from '../api'
import { assignmentRecords, planningIssues, planningSummary } from '../application/plan-records'
import { boardDays, buildBoard, unscheduledWorks } from '../application/schedule-board'
import { AssignDialog } from './assign-dialog'
import { AssignmentsList } from './assignments-list'
import { MoveAssignmentDialog } from './move-dialog'
import { ScheduleAgenda } from './schedule-agenda'
import { ScheduleBoard } from './schedule-board'

type Pending = { work: Work; crewId?: string; start?: IsoDate }

const rangeWeeks = { semana: 1, quincena: 2, mes: 4 } as const
type RangeMode = keyof typeof rangeWeeks
type View = 'calendario' | 'lista'

export function PlanningPage() {
  const workspace = useWorkspace()
  const today = clock.today()
  const [view, setView] = useUrlState<View>('vista', 'calendario', ['calendario', 'lista'])
  // Phones start with one week (5 columns fit); the calendar stays the default everywhere.
  const [mode, setMode] = useState<RangeMode>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'semana' : 'quincena',
  )
  const [layout, setLayout] = useState<'calendario' | 'agenda'>('calendario')
  const [offset, setOffset] = useState(0)
  const [pending, setPending] = useState<Pending | null>(null)
  const [slot, setSlot] = useState<{ crewId: string; date: IsoDate } | null>(null)
  const [moving, setMoving] = useState<Assignment | null>(null)
  const [removing, setRemoving] = useState<Assignment | null>(null)
  const find = lookup(workspace)
  const weeks = rangeWeeks[mode]
  const from = addDays(today, offset * weeks * 7)
  const days = boardDays(from, weeks)
  const rows = buildBoard(workspace, days)
  const unscheduled = unscheduledWorks(workspace)
  const records = assignmentRecords(workspace, today)
  const summary = planningSummary(workspace, today)
  const issues = planningIssues(workspace, today)
  const unassign = useCommand((id: string) => planningApi.unassign(id), {
    success: 'Asignación quitada. La cuadrilla ha recibido el aviso.',
    onSuccess: () => setRemoving(null),
  })
  const viewOptions: FilterOption<View>[] = [
    { value: 'calendario', label: 'Calendario', count: summary.busyCrews },
    { value: 'lista', label: 'Lista e histórico', count: records.length },
  ]

  return (
    <>
      <PageTop
        title="Planificación"
        description="Qué cuadrilla está en cada obra, quién falta y el histórico de lo planificado."
      />
      <MetricGrid className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Cuadrillas trabajando hoy"
          value={`${summary.busyCrews} de ${summary.crews}`}
          description={`${summary.crews - summary.busyCrews} libres`}
        />
        <MetricCard
          label="Obras en curso"
          value={summary.inProgress}
          description="Con partes ya enviados"
        />
        <MetricCard
          label="Sin planificar"
          value={summary.unscheduled}
          description="Esperan cuadrilla"
        />
        <MetricCard
          label="Avisos de planificación"
          value={summary.issues}
          description={summary.issues === 0 ? 'Todo en orden' : 'Solapes y ausencias'}
        />
      </MetricGrid>
      {issues.length > 0 ? (
        <Alert className="mb-5 border-amber-300 bg-amber-50 text-amber-950 **:text-amber-950">
          <AlertTitle>
            {issues.length} {issues.length === 1 ? 'aviso' : 'avisos'} que revisar
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-1">
              {issues.slice(0, 4).map((issue) => (
                <li key={issue.id} className="flex flex-wrap items-center gap-x-2">
                  <span>{issue.text}</span>
                  <Button
                    variant="link"
                    size="xs"
                    onPress={() =>
                      setMoving(
                        workspace.assignments.find((item) => item.id === issue.assignmentId) ??
                        null,
                      )
                    }
                  >
                    Resolver
                  </Button>
                </li>
              ))}
            </ul>
            {issues.length > 4 ? (
              <p className="mt-1 text-xs">Y {issues.length - 4} más en la lista.</p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="mb-4">
        <FilterTabs label="Vista" options={viewOptions} value={view} onChange={setView} />
      </div>
      {view === 'lista' ? (
        <AssignmentsList
          records={records}
          today={today}
          onMove={setMoving}
          onRemove={setRemoving}
        />
      ) : (
        <div className="space-y-4">
          {unscheduled.length > 0 ? (
            <section
              aria-labelledby="unscheduled-title"
              className="shortcut-strip bg-card border-border rounded-xl border p-3"
            >
              <h2
                id="unscheduled-title"
                className="flex shrink-0 items-center justify-start gap-2 px-1 text-sm font-semibold"
              >
                <Inbox aria-hidden="true" className="size-4" strokeWidth={1.75} />
                Sin planificar
                <span className="text-muted-foreground text-xs font-normal tabular-nums">
                  {formatNumber(unscheduled.length)}
                </span>
              </h2>
              <ul className="flex min-w-0 flex-1 justify-start gap-2 overflow-x-auto">
                {unscheduled.map((work) => (
                  <li
                    key={work.id}
                    className="border-border bg-muted/40 flex min-w-64 items-center gap-3 rounded-lg border py-2 pr-2 pl-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{work.title}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {find.zone(work.zoneId)?.name} · {work.planned.crewDays} días ·{' '}
                        {formatMoney(work.planned.price)}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => setPending({ work, start: nextWorkingDay(today) })}
                    >
                      Asignar
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <Panel aria-labelledby="board-title">
            <PanelHeader
              id="board-title"
              icon={<CalendarRange className="size-5" strokeWidth={1.75} />}
              title={`${formatShortDate(days[0] ?? from)} – ${formatShortDate(days.at(-1) ?? from)}`}
              description="Pulsa un hueco libre para asignar una obra, o el menú de una barra para moverla."
              action={
                <div className="flex items-center gap-2">
                  <ChoiceField
                    hideLabel
                    className="hidden w-32 sm:flex"
                    label="Rango"
                    value={mode}
                    onChange={(value) => {
                      setMode(value as RangeMode)
                      setOffset(0)
                    }}
                    options={[
                      { value: 'semana', label: '1 semana' },
                      { value: 'quincena', label: '2 semanas' },
                      { value: 'mes', label: '4 semanas' },
                    ]}
                  />
                  <ButtonGroup>
                    <IconButton
                      label="Anterior"
                      variant="outline"
                      onPress={() => setOffset((value) => value - 1)}
                    >
                      <ChevronLeft aria-hidden="true" className="size-4" />
                    </IconButton>
                    <Button variant="outline" onPress={() => setOffset(0)}>
                      Hoy
                    </Button>
                    <IconButton
                      label="Siguiente"
                      variant="outline"
                      onPress={() => setOffset((value) => value + 1)}
                    >
                      <ChevronRight aria-hidden="true" className="size-4" />
                    </IconButton>
                  </ButtonGroup>
                </div>
              }
            />
            <div className="border-border border-b px-4 py-2 md:hidden">
              <FilterTabs
                label="Forma de verlo"
                options={[
                  { value: 'calendario', label: 'Calendario', count: days.length },
                  { value: 'agenda', label: 'Agenda', count: rows.length },
                ]}
                value={layout}
                onChange={setLayout}
              />
            </div>
            <div className={layout === 'agenda' ? 'hidden md:block' : undefined}>
              <ScheduleBoard
                workspace={workspace}
                days={days}
                rows={rows}
                today={today}
                onAssign={(crewId, date) => setSlot({ crewId, date })}
                onMove={setMoving}
                onRemove={setRemoving}
              />
            </div>
            <div className={layout === 'agenda' ? 'md:hidden' : 'hidden'}>
              <ScheduleAgenda
                workspace={workspace}
                rows={rows}
                onAssign={(crewId, date) => setSlot({ crewId, date })}
                onMove={setMoving}
                onRemove={setRemoving}
              />
            </div>
          </Panel>
        </div>
      )}
      {moving ? <MoveAssignmentDialog assignment={moving} onClose={() => setMoving(null)} /> : null}
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="¿Quitar esta asignación?"
        description={`${find.work(removing?.workId ?? '')?.title ?? 'La obra'} dejará de estar en el calendario de ${find.crew(removing?.crewId ?? '')?.name ?? 'la cuadrilla'}, que recibirá un aviso.`}
        confirmLabel="Quitar"
        destructive
        pending={unassign.isPending}
        onConfirm={() => removing && unassign.mutate(removing.id)}
      />
      {pending ? (
        <AssignDialog
          work={pending.work}
          open
          onOpenChange={(open) => !open && setPending(null)}
          {...(pending.start ? { defaultStart: pending.start } : {})}
          {...(pending.crewId ? { defaultCrewId: pending.crewId } : {})}
        />
      ) : null}
      <DialogRoot open={Boolean(slot)} onOpenChange={(open) => !open && setSlot(null)}>
        <DialogContent className="w-[min(28rem,calc(100vw-2rem))] rounded-xl">
          <DialogHeader>
            <DialogTitle>¿Qué obra empieza aquí?</DialogTitle>
            <DialogDescription>
              {slot ? `${find.crew(slot.crewId)?.name} · ${formatShortDate(slot.date)}` : ''}
            </DialogDescription>
          </DialogHeader>
          {unscheduled.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay obras pendientes de planificar.</p>
          ) : (
            <ul className="divide-border border-border divide-y overflow-hidden rounded-lg border">
              {unscheduled.map((work) => (
                <li key={work.id}>
                  <button
                    type="button"
                    className="panel-row w-full px-4 py-3 text-left"
                    onClick={() => {
                      if (slot) setPending({ work, crewId: slot.crewId, start: slot.date })
                      setSlot(null)
                    }}
                  >
                    <span className="block text-sm font-semibold">{work.title}</span>
                    <span className="text-muted-foreground block text-xs">
                      {work.planned.crewDays} días de cuadrilla
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </DialogRoot>
    </>
  )
}
