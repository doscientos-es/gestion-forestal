import {
  Button,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  Textarea,
} from '@doscientos/ui'
import { AlertTriangle } from 'lucide-react'
import { useId, useState } from 'react'

import {
  absenceWorkingDays,
  lookup,
  useWorkspace,
  vacationBalance,
  type AbsenceType,
  type Person,
} from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { addWorkingDays, nextWorkingDay, rangesOverlap } from '@/shared/lib/dates'
import { formatShortDate } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { ChoiceField, TextField } from '@/shared/ui/form-controls'

import { absencesApi } from '../api'

export function AbsenceRequestDialog({
  open,
  onOpenChange,
  user,
  initialDate,
  initialPersonId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: Person
  /** First day to pre-fill (e.g. the day picked in the calendar). */
  initialDate?: string
  /** Office only: the person the absence is for (e.g. from the crews screen). */
  initialPersonId?: string
}) {
  const workspace = useWorkspace()
  const find = lookup(workspace)
  const today = clock.today()
  const isAdmin = user.role === 'admin'
  // Workers can only ask for future dates; the office may register past absences (e.g. sick leave).
  const minDate = isAdmin ? undefined : today
  const workers = workspace.people.filter((person) => person.role !== 'admin')
  const [personId, setPersonId] = useState(
    isAdmin ? (initialPersonId ?? workers[0]?.id ?? '') : user.id,
  )
  const [type, setType] = useState<AbsenceType>('vacaciones')
  const [start, setStart] = useState(initialDate ?? addWorkingDays(nextWorkingDay(today), 10))
  const [end, setEnd] = useState(
    initialDate ? initialDate : addWorkingDays(nextWorkingDay(today), 14),
  )
  const [note, setNote] = useState('')
  const noteId = useId()
  const person = find.person(personId)
  const days = end >= start ? absenceWorkingDays({ start, end }) : 0
  const balance = vacationBalance(personId, Number(start.slice(0, 4)), workspace.absences)
  const valid = Boolean(start) && Boolean(end) && end >= start && (!minDate || start >= minDate)
  const overBalance = !isAdmin && type === 'vacaciones' && valid && days > balance.remaining
  const affected = person?.crewId
    ? workspace.assignments.filter(
        (item) => item.crewId === person.crewId && rangesOverlap(item.start, item.end, start, end),
      )
    : []

  const save = useCommand(
    () => absencesApi.request({ personId, type, start, end, note }, isAdmin),
    {
      success: () => ({
        title: isAdmin ? 'Ausencia registrada' : 'Solicitud enviada',
        description: `${person?.name ?? ''} · ${formatShortDate(start)} – ${formatShortDate(end)}`,
      }),
      onSuccess: () => onOpenChange(false),
    },
  )

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(30rem,calc(100vw-2rem))] rounded-xl">
        <DialogHeader>
          <DialogTitle>{isAdmin ? 'Registrar ausencia' : 'Pedir vacaciones o permiso'}</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? 'Queda aprobada directamente.'
              : 'La oficina recibe la solicitud y la aprueba o rechaza.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {isAdmin ? (
            <ChoiceField
              className="sm:col-span-2"
              label="Persona"
              value={personId}
              onChange={setPersonId}
              options={workers.map((item) => ({ value: item.id, label: item.name }))}
            />
          ) : null}
          <ChoiceField
            className="sm:col-span-2"
            label="Tipo"
            value={type}
            onChange={(value) => setType(value as AbsenceType)}
            options={[
              { value: 'vacaciones', label: 'Vacaciones' },
              { value: 'permiso', label: 'Permiso' },
              { value: 'baja', label: 'Baja médica' },
            ]}
          />
          <TextField
            type="date"
            label="Desde"
            value={start}
            {...(minDate ? { min: minDate } : {})}
            invalid={!start || (minDate !== undefined && start < minDate)}
            onChange={(value) => {
              setStart(value)
              if (value && end < value) setEnd(value)
            }}
          />
          <TextField
            type="date"
            label="Hasta"
            value={end}
            min={start || minDate}
            onChange={setEnd}
            invalid={!end || end < start}
          />
          <div className="sm:col-span-2">
            <label
              htmlFor={noteId}
              className="text-muted-foreground mb-1.5 block text-xs font-medium"
            >
              Comentario
            </label>
            <Textarea
              id={noteId}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-16"
            />
          </div>
        </div>
        <p className={overBalance ? 'text-sm text-red-700' : 'text-muted-foreground text-sm'}>
          {days} días laborables
          {type === 'vacaciones'
            ? ` · quedarían ${balance.remaining - days} de ${balance.total}`
            : ''}
          {overBalance ? ' · supera los días disponibles' : ''}
        </p>
        {affected.length > 0 ? (
          <p
            role="status"
            className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Coincide con {affected
              .map((item) => `«${find.work(item.workId)?.title}»`)
              .join(', ')}{' '}
            de su cuadrilla.
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onPress={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onPress={() => save.mutate(undefined)}
            isDisabled={save.isPending || !personId || !valid || overBalance}
          >
            {isAdmin ? 'Registrar' : 'Enviar solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
