import { Button, Checkbox, IconButton, Input } from '@doscientos/ui'
import { ListChecks, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  lookup,
  suggestTasks,
  useWorkspace,
  type Person,
  type Work,
} from '@/features/workspace'
import { formatShortDate } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { Panel, PanelHeader, ProgressBar } from '@/shared/ui/surface'

import { tasksApi } from '../api'
import { SuggestedTasks } from './suggested-tasks'

/**
 * Checklist of a work. The office writes and removes tasks; any member of the assigned crew
 * ticks them off. `canEdit` is a UI affordance only: production enforces it with RLS.
 */
export function TaskChecklist({
  work,
  user,
  canEdit,
  onAssign,
}: {
  work: Work
  user: Person
  canEdit: boolean
  /** Opens the crew assignment of the work, offered while it has no crew. */
  onAssign?: () => void
}) {
  const workspace = useWorkspace()
  const find = lookup(workspace)
  const [text, setText] = useState('')
  const tasks = workspace.tasks.filter((task) => task.workId === work.id)
  const suggestions = canEdit ? suggestTasks(workspace, work) : []
  const crewAssigned = workspace.assignments.some((item) => item.workId === work.id)
  const done = tasks.filter((task) => task.doneOn).length
  const add = useCommand((value: string) => tasksApi.add(work.id, value), {
    success: () =>
      crewAssigned
        ? { title: 'Tarea enviada a la cuadrilla' }
        : {
          title: 'Tarea guardada',
          description: 'Se avisará a la cuadrilla cuando asignes la obra.',
        },
    onSuccess: () => setText(''),
  })
  const toggle = useCommand(({ taskId, value }: { taskId: string; value: boolean }) =>
    tasksApi.setDone(taskId, user.id, value),
  )
  const remove = useCommand((taskId: string) => tasksApi.remove(taskId), {
    success: 'Tarea eliminada',
  })

  return (
    <Panel aria-labelledby="tasks-title">
      <PanelHeader
        id="tasks-title"
        icon={<ListChecks className="size-5" strokeWidth={1.75} />}
        title="Qué hay que hacer"
        description={
          tasks.length > 0 ? `${done} de ${tasks.length} completadas` : 'Tareas para la cuadrilla'
        }
      />
      {tasks.length > 0 ? (
        <div className="border-border border-b px-5 py-3">
          <ProgressBar value={done / tasks.length} label="Tareas completadas" />
        </div>
      ) : null}
      {tasks.length === 0 && canEdit && suggestions.length > 0 ? (
        <SuggestedTasks
          workId={work.id}
          suggestions={suggestions}
          crewAssigned={crewAssigned}
          onAssign={onAssign}
        />
      ) : tasks.length === 0 ? (
        <EmptyPanel
          icon={<ListChecks className="size-5" />}
          title="Sin tareas todavía"
          description={
            canEdit
              ? 'Escribe lo que la cuadrilla debe hacer y recibirá un aviso.'
              : 'La oficina todavía no ha indicado tareas para esta obra.'
          }
        />
      ) : (
        <ul className="divide-border divide-y">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-3 px-5 py-3">
              <Checkbox
                aria-label={task.text}
                isSelected={Boolean(task.doneOn)}
                isDisabled={canEdit}
                onChange={(value) => toggle.mutate({ taskId: task.id, value })}
              >
                <span
                  className={task.doneOn ? 'text-muted-foreground line-through' : 'text-foreground'}
                >
                  {task.text}
                </span>
              </Checkbox>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {task.doneOn ? (
                  <span className="text-muted-foreground text-xs">
                    {find.person(task.doneBy ?? '')?.name.split(' ')[0]} ·{' '}
                    {formatShortDate(task.doneOn)}
                  </span>
                ) : null}
                {canEdit ? (
                  <IconButton
                    label={`Eliminar tarea: ${task.text}`}
                    variant="ghost"
                    size="icon-sm"
                    onPress={() => remove.mutate(task.id)}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </IconButton>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <form
          className="border-border flex gap-2 border-t p-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (text.trim()) add.mutate(text)
          }}
        >
          <Input
            aria-label="Nueva tarea para la cuadrilla"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Ej. Revisar marras de la franja alta"
            className="flex-1"
          />
          <Button type="submit" isDisabled={!text.trim() || add.isPending}>
            <Plus aria-hidden="true" className="size-4" /> Añadir
          </Button>
        </form>
      ) : null}
    </Panel>
  )
}
