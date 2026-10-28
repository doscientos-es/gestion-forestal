import { Button, Checkbox, Input } from '@doscientos/ui'
import { Send, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { pluralize } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'

import { tasksApi } from '../api'

type Row = { text: string; on: boolean }

/**
 * One suggested task per line of the budget. The office keeps the ones it wants, rewords them if
 * needed and sends them together, so the crew gets a single notice instead of one per task.
 */
export function SuggestedTasks({
  workId,
  suggestions,
  crewAssigned,
  onAssign,
}: {
  workId: string
  suggestions: string[]
  /** Without a crew nobody is notified: the tasks are saved and wait for the assignment. */
  crewAssigned: boolean
  /** Opens the crew assignment; offered first when the work has no crew yet. */
  onAssign?: (() => void) | undefined
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    suggestions.map((text) => ({ text, on: true })),
  )
  const chosen = rows.filter((row) => row.on && row.text.trim())
  const send = useCommand(() => tasksApi.addMany(workId, chosen.map((row) => row.text)), {
    success: () =>
      crewAssigned
        ? {
          title: pluralize(chosen.length, 'tarea enviada', 'tareas enviadas'),
          description: 'La cuadrilla ha recibido un solo aviso.',
        }
        : {
          title: pluralize(chosen.length, 'tarea guardada', 'tareas guardadas'),
          description: 'Se avisará a la cuadrilla cuando asignes la obra.',
        },
  })
  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  return (
    <div className="px-5 py-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Sparkles aria-hidden="true" className="text-brand size-4" />
        Sugerencias del presupuesto
      </p>
      <p className="text-muted-foreground mt-1 text-xs">
        {crewAssigned
          ? 'Una por partida. Quita o cambia las que no quieras: se envían juntas con un solo aviso.'
          : 'Una por partida. Quita o cambia las que no quieras. Todavía no hay cuadrilla asignada: se guardan y se avisará cuando asignes la obra.'}
      </p>
      {!crewAssigned && onAssign ? (
        <div className="bg-muted mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-xs">
          <span>Lo primero es asignar la obra a una cuadrilla.</span>
          <Button variant="outline" size="xs" onPress={onAssign}>
            Asignar cuadrilla
          </Button>
        </div>
      ) : null}
      <ul className="mt-3 space-y-2">
        {rows.map((row, index) => (
          <li key={suggestions[index]} className="flex items-center gap-3">
            <Checkbox
              aria-label={`Incluir: ${suggestions[index]}`}
              isSelected={row.on}
              onChange={(on) => update(index, { on })}
            />
            <Input
              aria-label={`Texto de la tarea ${index + 1}`}
              value={row.text}
              disabled={!row.on}
              onChange={(event) => update(index, { text: event.target.value })}
              className="flex-1"
            />
          </li>
        ))}
      </ul>
      <Button
        className="mt-3"
        size="sm"
        isDisabled={chosen.length === 0 || send.isPending}
        onPress={() => send.mutate(undefined)}
      >
        <Send aria-hidden="true" className="size-4" /> {crewAssigned ? 'Enviar' : 'Guardar'}{' '}
        {pluralize(chosen.length, 'tarea', 'tareas')}
        {crewAssigned ? ' a la cuadrilla' : ''}
      </Button>
    </div>
  )
}
