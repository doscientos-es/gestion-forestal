import { Button, ConfirmDialog } from '@doscientos/ui'
import { Plus, UserPlus } from 'lucide-react'
import { useState } from 'react'

import { AbsenceRequestDialog } from '@/features/absences'
import { useCurrentUser, useWorkspace, type Crew, type Person } from '@/features/workspace'
import { useCommand } from '@/shared/lib/use-command'
import { useUrlState } from '@/shared/lib/use-url-state'
import { FilterTabs } from '@/shared/ui/filter-tabs'
import { PageTop } from '@/shared/ui/page-top'

import { crewsApi } from '../api'
import { CreateCrewDialog, ForemanDialog, MoveWorkerDialog, RenameCrewDialog } from './crew-dialogs'
import { CrewPanel, type CrewActions } from './crew-panel'
import { ProfitabilityPanel } from './profitability-panel'
import { WorkerDialog } from './worker-dialog'

type View = 'equipos' | 'rentabilidad'

type Dialog =
  | { kind: 'add'; crewId: string | null }
  | { kind: 'edit'; person: Person }
  | { kind: 'move'; person: Person }
  | { kind: 'absence'; person: Person }
  | { kind: 'foreman'; crew: Crew }
  | { kind: 'rename'; crew: Crew }
  | { kind: 'newCrew' }
  | { kind: 'dissolve'; crew: Crew }
  | { kind: 'remove'; person: Person }

export function CrewsPage() {
  const workspace = useWorkspace()
  const user = useCurrentUser()
  const [view, setView] = useUrlState<View>('vista', 'equipos', ['equipos', 'rentabilidad'])
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const close = () => setDialog(null)
  const dissolve = useCommand((crewId: string) => crewsApi.dissolveCrew(crewId), {
    success: 'Cuadrilla disuelta',
    onSuccess: close,
  })
  const remove = useCommand((personId: string) => crewsApi.moveWorker(personId, null), {
    success: 'Quitado de la cuadrilla',
    onSuccess: close,
  })
  const makeForeman = useCommand(
    ({ crew, person }: { crew: Crew; person: Person }) => crewsApi.setForeman(crew.id, person.id),
    { success: 'Capataz cambiado' },
  )
  const people = workspace.people.filter((person) => person.role !== 'admin')
  const unassigned = people.filter((person) => !person.crewId)

  const actions: CrewActions = {
    onAdd: (crewId) => setDialog({ kind: 'add', crewId }),
    onEdit: (person) => setDialog({ kind: 'edit', person }),
    onMove: (person) => setDialog({ kind: 'move', person }),
    onAbsence: (person) => setDialog({ kind: 'absence', person }),
    onForeman: (crew) => setDialog({ kind: 'foreman', crew }),
    onRename: (crew) => setDialog({ kind: 'rename', crew }),
    onDissolve: (crew) => setDialog({ kind: 'dissolve', crew }),
    onMakeForeman: (crew, person) => makeForeman.mutate({ crew, person }),
    onRemove: (person) => setDialog({ kind: 'remove', person }),
  }

  return (
    <>
      <PageTop
        title="Cuadrillas"
        description="Quién está en cada cuadrilla, cambios de equipo, bajas y vacaciones, y cuál rinde más."
        actions={
          <>
            <Button variant="outline" onPress={() => setDialog({ kind: 'newCrew' })}>
              <Plus aria-hidden="true" className="size-4" /> Nueva cuadrilla
            </Button>
            <Button onPress={() => setDialog({ kind: 'add', crewId: null })}>
              <UserPlus aria-hidden="true" className="size-4" /> Añadir trabajador
            </Button>
          </>
        }
      />
      <div className="mb-4">
        <FilterTabs
          label="Vista de cuadrillas"
          value={view}
          onChange={setView}
          options={[
            { value: 'equipos', label: 'Equipos', count: people.length },
            { value: 'rentabilidad', label: 'Rentabilidad', count: workspace.crews.length },
          ]}
        />
      </div>
      {view === 'rentabilidad' ? (
        <ProfitabilityPanel />
      ) : (
        <div className="space-y-5">
          {workspace.crews.map((crew) => (
            <CrewPanel
              key={crew.id}
              crew={crew}
              people={people.filter((person) => person.crewId === crew.id)}
              actions={actions}
            />
          ))}
          {unassigned.length > 0 ? (
            <CrewPanel crew={null} people={unassigned} actions={actions} />
          ) : null}
        </div>
      )}

      {dialog?.kind === 'add' ? (
        <WorkerDialog defaultCrewId={dialog.crewId} onClose={close} />
      ) : null}
      {dialog?.kind === 'edit' ? <WorkerDialog person={dialog.person} onClose={close} /> : null}
      {dialog?.kind === 'move' ? <MoveWorkerDialog person={dialog.person} onClose={close} /> : null}
      {dialog?.kind === 'foreman' ? <ForemanDialog crew={dialog.crew} onClose={close} /> : null}
      {dialog?.kind === 'rename' ? <RenameCrewDialog crew={dialog.crew} onClose={close} /> : null}
      {dialog?.kind === 'newCrew' ? <CreateCrewDialog onClose={close} /> : null}
      {dialog?.kind === 'absence' && user ? (
        <AbsenceRequestDialog
          open
          onOpenChange={(open) => !open && close()}
          user={user}
          initialPersonId={dialog.person.id}
        />
      ) : null}
      <ConfirmDialog
        open={dialog?.kind === 'dissolve'}
        onOpenChange={(open) => !open && close()}
        title={dialog?.kind === 'dissolve' ? `¿Disolver ${dialog.crew.name}?` : ''}
        description="Todas las personas quedan sin cuadrilla y el capataz vuelve a ser peón. No se puede si la cuadrilla tiene obras en la planificación."
        confirmLabel="Disolver cuadrilla"
        destructive
        pending={dissolve.isPending}
        onConfirm={() => dialog?.kind === 'dissolve' && dissolve.mutate(dialog.crew.id)}
      />
      <ConfirmDialog
        open={dialog?.kind === 'remove'}
        onOpenChange={(open) => !open && close()}
        title={dialog?.kind === 'remove' ? `¿Quitar a ${dialog.person.name} de la cuadrilla?` : ''}
        description="Seguirá en la empresa, sin cuadrilla, y se le avisa. Podrás asignarlo a otra cuando quieras."
        confirmLabel="Quitar de la cuadrilla"
        pending={remove.isPending}
        onConfirm={() => dialog?.kind === 'remove' && remove.mutate(dialog.person.id)}
      />
    </>
  )
}
