import {
  Button,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@doscientos/ui'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'

import { findConflicts, lookup, useWorkspace, type Assignment } from '@/features/workspace'
import { useCommand } from '@/shared/lib/use-command'
import { ChoiceField, TextField } from '@/shared/ui/form-controls'

import { planningApi } from '../api'

/** Changes the dates or the crew of an existing assignment; the crews get a notice. */
export function MoveAssignmentDialog({
  assignment,
  onClose,
}: {
  assignment: Assignment
  onClose: () => void
}) {
  const workspace = useWorkspace()
  const find = lookup(workspace)
  const [crewId, setCrewId] = useState(assignment.crewId)
  const [start, setStart] = useState(assignment.start)
  const [end, setEnd] = useState(assignment.end)
  const valid = Boolean(crewId && start && end && end >= start)
  const conflicts = valid
    ? findConflicts(
        { id: assignment.id, crewId, start, end },
        workspace.assignments,
        workspace.people,
        workspace.absences,
      )
    : []
  const overlaps = conflicts.filter((conflict) => conflict.kind === 'solape')
  const absences = conflicts.filter((conflict) => conflict.kind === 'ausencia')
  const move = useCommand(() => planningApi.move(assignment.id, { crewId, start, end }), {
    success: 'Planificación actualizada. La cuadrilla ha recibido el aviso.',
    onSuccess: onClose,
  })

  return (
    <DialogRoot open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(30rem,calc(100vw-2rem))] rounded-xl">
        <DialogHeader>
          <DialogTitle>Mover asignación</DialogTitle>
          <DialogDescription>{find.work(assignment.workId)?.title}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceField
            className="sm:col-span-2"
            label="Cuadrilla"
            value={crewId}
            onChange={setCrewId}
            options={workspace.crews.map((crew) => ({ value: crew.id, label: crew.name }))}
          />
          <TextField
            type="date"
            label="Inicio"
            value={start}
            invalid={!start}
            onChange={(value) => {
              setStart(value)
              if (value && end < value) setEnd(value)
            }}
          />
          <TextField
            type="date"
            label="Fin"
            value={end}
            min={start}
            invalid={!end || end < start}
            onChange={setEnd}
          />
        </div>
        {overlaps.length > 0 ? (
          <p
            role="alert"
            className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Esa cuadrilla ya tiene otra obra en esas fechas.
          </p>
        ) : null}
        {absences.length > 0 ? (
          <output className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {absences.length} {absences.length === 1 ? 'persona' : 'personas'} de la cuadrilla
            estarán ausentes en algún día.
          </output>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            onPress={() => move.mutate(undefined)}
            isDisabled={move.isPending || !valid || overlaps.length > 0}
          >
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
