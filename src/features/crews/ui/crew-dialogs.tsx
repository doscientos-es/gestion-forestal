import {
  Button,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@doscientos/ui'
import { useState, type ReactNode } from 'react'

import { useWorkspace, type Crew, type Person } from '@/features/workspace'
import { useCommand } from '@/shared/lib/use-command'
import { ChoiceField, TextField } from '@/shared/ui/form-controls'

import { crewsApi } from '../api'

function Shell({
  title,
  description,
  onClose,
  confirmLabel,
  disabled,
  pending,
  onConfirm,
  children,
}: {
  title: string
  description: string
  onClose: () => void
  confirmLabel: string
  disabled: boolean
  pending: boolean
  onConfirm: () => void
  children: ReactNode
}) {
  return (
    <DialogRoot open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(28rem,calc(100vw-2rem))] rounded-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="ghost" onPress={onClose}>
            Cancelar
          </Button>
          <Button isDisabled={disabled || pending} onPress={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

/** A crew needs a foreman: the person chosen moves into it. */
export function CreateCrewDialog({ onClose }: { onClose: () => void }) {
  const workspace = useWorkspace()
  const foremen = new Set(workspace.crews.map((crew) => crew.foremanId))
  const candidates = workspace.people.filter((p) => p.role !== 'admin' && !foremen.has(p.id))
  const [name, setName] = useState('')
  const [foremanId, setForemanId] = useState(candidates[0]?.id ?? '')
  const save = useCommand(() => crewsApi.createCrew({ name, foremanId }), {
    success: (crew) => ({ title: 'Cuadrilla creada', description: crew.name }),
    onSuccess: onClose,
  })
  return (
    <Shell
      title="Nueva cuadrilla"
      description="Elige quién la dirige: pasará a ser su capataz y rellenará el parte diario."
      onClose={onClose}
      confirmLabel="Crear cuadrilla"
      disabled={!name.trim() || !foremanId}
      pending={save.isPending}
      onConfirm={() => save.mutate(undefined)}
    >
      <div className="grid gap-3">
        <TextField
          label="Nombre"
          placeholder="Ej. Cuadrilla Costa"
          value={name}
          onChange={setName}
        />
        <ChoiceField
          label="Capataz"
          value={foremanId}
          onChange={setForemanId}
          options={candidates.map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>
    </Shell>
  )
}

export function RenameCrewDialog({ crew, onClose }: { crew: Crew; onClose: () => void }) {
  const [name, setName] = useState(crew.name)
  const save = useCommand(() => crewsApi.renameCrew(crew.id, name), {
    success: 'Cuadrilla renombrada',
    onSuccess: onClose,
  })
  return (
    <Shell
      title="Renombrar cuadrilla"
      description="El nuevo nombre se ve en toda la aplicación."
      onClose={onClose}
      confirmLabel="Guardar nombre"
      disabled={!name.trim()}
      pending={save.isPending}
      onConfirm={() => save.mutate(undefined)}
    >
      <TextField label="Nombre" value={name} onChange={setName} />
    </Shell>
  )
}

export function ForemanDialog({ crew, onClose }: { crew: Crew; onClose: () => void }) {
  const workspace = useWorkspace()
  const members = workspace.people.filter((p) => p.crewId === crew.id && p.id !== crew.foremanId)
  const [personId, setPersonId] = useState(members[0]?.id ?? '')
  const save = useCommand(() => crewsApi.setForeman(crew.id, personId), {
    success: 'Capataz cambiado',
    onSuccess: onClose,
  })
  return (
    <Shell
      title={`Capataz de ${crew.name}`}
      description="La persona elegida rellenará el parte; el capataz actual pasa a ser peón."
      onClose={onClose}
      confirmLabel="Nombrar capataz"
      disabled={!personId}
      pending={save.isPending}
      onConfirm={() => save.mutate(undefined)}
    >
      <ChoiceField
        label="Nuevo capataz"
        value={personId}
        onChange={setPersonId}
        options={members.map((p) => ({ value: p.id, label: p.name }))}
      />
    </Shell>
  )
}

const NO_CREW = 'ninguna'

/** Moves a worker to another crew, or leaves them without one. */
export function MoveWorkerDialog({ person, onClose }: { person: Person; onClose: () => void }) {
  const workspace = useWorkspace()
  const options = [
    ...workspace.crews
      .filter((c) => c.id !== person.crewId)
      .map((c) => ({ value: c.id, label: c.name })),
    ...(person.crewId ? [{ value: NO_CREW, label: 'Sin cuadrilla' }] : []),
  ]
  const [target, setTarget] = useState(options[0]?.value ?? '')
  const save = useCommand(
    () => crewsApi.moveWorker(person.id, target === NO_CREW ? null : target),
    {
      success: (_output) => ({
        title: 'Cambio de cuadrilla',
        description: `${person.name} · se le ha avisado`,
      }),
      onSuccess: onClose,
    },
  )
  return (
    <Shell
      title={`Cambiar de cuadrilla a ${person.name}`}
      description="El cambio es inmediato: aparece en el calendario y en los partes desde hoy. Se le avisa."
      onClose={onClose}
      confirmLabel="Cambiar de cuadrilla"
      disabled={!target}
      pending={save.isPending}
      onConfirm={() => save.mutate(undefined)}
    >
      <ChoiceField label="Nueva cuadrilla" value={target} onChange={setTarget} options={options} />
    </Shell>
  )
}
