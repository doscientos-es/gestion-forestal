import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  Textarea,
} from '@doscientos/ui'
import { AlertTriangle, Bell, CalendarCheck } from 'lucide-react'
import { useState } from 'react'

import {
  absenceType,
  findConflicts,
  lookup,
  suggestedEnd,
  useWorkspace,
  type Work,
} from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { nextWorkingDay } from '@/shared/lib/dates'
import { formatDate, formatShortDate } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { ChoiceField, TextField } from '@/shared/ui/form-controls'

import { planningApi } from '../api'

export function AssignDialog({
  work,
  open,
  onOpenChange,
  defaultStart,
  defaultCrewId,
}: {
  work: Work
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStart?: string
  defaultCrewId?: string
}) {
  const workspace = useWorkspace()
  const find = lookup(workspace)
  const initialStart = defaultStart ?? nextWorkingDay(clock.today())
  const [crewId, setCrewId] = useState(defaultCrewId ?? workspace.crews[0]?.id ?? '')
  const [start, setStart] = useState(initialStart)
  const [end, setEnd] = useState(suggestedEnd(work, initialStart))
  const conflicts =
    crewId && start && end
      ? findConflicts(
          { crewId, start, end },
          workspace.assignments,
          workspace.people,
          workspace.absences,
        )
      : []

  const [tasksText, setTasksText] = useState('')
  const tasks = tasksText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const members = workspace.people.filter((person) => person.crewId === crewId)

  const assign = useCommand(
    () => planningApi.assign({ workId: work.id, crewId, start, end, tasks }),
    {
      success: () => ({
        title: 'Obra adjudicada',
        description: `${members.length} personas de ${find.crew(crewId)?.name ?? 'la cuadrilla'} han recibido el aviso.`,
      }),
      onSuccess: () => onOpenChange(false),
    },
  )

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))] rounded-xl">
        <DialogHeader>
          <DialogTitle>Asignar a cuadrilla</DialogTitle>
          <DialogDescription>
            {work.title}: el presupuesto prevé {work.planned.crewDays} días de una cuadrilla de{' '}
            {work.planned.crewSize}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceField
            className="sm:col-span-2"
            label="Cuadrilla"
            value={crewId}
            onChange={setCrewId}
            options={workspace.crews.map((crew) => ({
              value: crew.id,
              label: `${crew.name} · ${find.person(crew.foremanId)?.name ?? ''}`,
            }))}
          />
          <TextField
            type="date"
            label="Inicio"
            value={start}
            onChange={(value) => {
              setStart(value)
              if (value) setEnd(suggestedEnd(work, value))
            }}
          />
          <TextField
            type="date"
            label="Fin previsto"
            value={end}
            min={start}
            onChange={setEnd}
            invalid={!end || end < start}
          />
          <div className="sm:col-span-2">
            <label
              htmlFor="assign-tasks"
              className="text-muted-foreground mb-1.5 block text-xs font-medium"
            >
              Tareas para la cuadrilla (una por línea, opcional)
            </label>
            <Textarea
              id="assign-tasks"
              value={tasksText}
              onChange={(event) => setTasksText(event.target.value)}
              placeholder={'Recoger la planta en el vivero\nRevisar el acceso por la pista'}
              className="min-h-20"
            />
          </div>
        </div>
        {conflicts.length > 0 ? (
          <Alert variant="warning">
            <AlertTitle>
              <AlertTriangle aria-hidden="true" className="mr-1.5 inline size-4" />
              Revisa antes de asignar
            </AlertTitle>
            <AlertDescription>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                {conflicts.map((conflict) =>
                  conflict.kind === 'ausencia' ? (
                    <li key={conflict.absence.id}>
                      {conflict.person.name}: {absenceType[conflict.absence.type].toLowerCase()} del{' '}
                      {formatDate(conflict.absence.start)} al {formatDate(conflict.absence.end)}
                      {conflict.absence.status === 'solicitada' ? ' (pendiente de aprobar)' : ''}
                    </li>
                  ) : (
                    <li key={conflict.assignment.id}>
                      Ya tiene «{find.work(conflict.assignment.workId)?.title}» del{' '}
                      {formatShortDate(conflict.assignment.start)} al{' '}
                      {formatShortDate(conflict.assignment.end)}
                    </li>
                  ),
                )}
              </ul>
            </AlertDescription>
          </Alert>
        ) : crewId ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <CalendarCheck aria-hidden="true" className="text-brand size-4" /> Cuadrilla completa en
            esas fechas.
          </p>
        ) : null}
        {members.length > 0 ? (
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <Bell aria-hidden="true" className="size-3.5" />
            Recibirán el aviso: {members.map((person) => person.name.split(' ')[0]).join(', ')}.
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onPress={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onPress={() => assign.mutate(undefined)}
            isDisabled={assign.isPending || !crewId || !start || !end || end < start}
          >
            {conflicts.length > 0 ? 'Asignar igualmente' : 'Adjudicar obra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
