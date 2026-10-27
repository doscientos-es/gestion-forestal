import {
  Button,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@doscientos/ui'
import { useState } from 'react'

import { useWorkspace, type Person } from '@/features/workspace'
import { useCommand } from '@/shared/lib/use-command'
import { ChoiceField, NumberField, TextField } from '@/shared/ui/form-controls'

import { crewsApi } from '../api'

const NO_CREW = 'ninguna'
const DEFAULT_DAILY_COST = 15_500

/** Add a worker (optionally straight into a crew) or edit one's contact details and cost. */
export function WorkerDialog({
  person,
  defaultCrewId,
  onClose,
}: {
  /** The person being edited; absent when adding. */
  person?: Person
  defaultCrewId?: string | null
  onClose: () => void
}) {
  const workspace = useWorkspace()
  const [name, setName] = useState(person?.name ?? '')
  const [phone, setPhone] = useState(person?.phone ?? '')
  const [email, setEmail] = useState(person?.email ?? '')
  const [cost, setCost] = useState((person?.dailyCost ?? DEFAULT_DAILY_COST) / 100)
  const [crewId, setCrewId] = useState(defaultCrewId ?? NO_CREW)
  const input = { name, phone, email, dailyCost: Math.round(cost * 100) }
  const save = useCommand(
    async () => {
      if (person) await crewsApi.updateWorker(person.id, input)
      else await crewsApi.addWorker({ ...input, crewId: crewId === NO_CREW ? null : crewId })
    },
    {
      success: person ? 'Datos guardados' : 'Trabajador añadido',
      onSuccess: onClose,
    },
  )

  return (
    <DialogRoot open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(30rem,calc(100vw-2rem))] rounded-xl">
        <DialogHeader>
          <DialogTitle>{person ? `Editar a ${person.name}` : 'Añadir trabajador'}</DialogTitle>
          <DialogDescription>
            {person
              ? 'El coste de la peonada se usa para calcular la rentabilidad de cada obra.'
              : 'Podrá pedir vacaciones y ver sus obras. Puedes cambiarlo de cuadrilla cuando quieras.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            label="Nombre completo"
            value={name}
            onChange={setName}
          />
          <TextField
            label="Teléfono (WhatsApp)"
            placeholder="+34 600 000 000"
            value={phone}
            onChange={setPhone}
          />
          <TextField
            label="Correo"
            placeholder="nombre@empresa.es"
            value={email}
            onChange={setEmail}
          />
          <NumberField label="Coste de una peonada" suffix="€" value={cost} onChange={setCost} />
          {person ? null : (
            <ChoiceField
              label="Cuadrilla"
              value={crewId}
              onChange={setCrewId}
              options={[
                ...workspace.crews.map((crew) => ({ value: crew.id, label: crew.name })),
                { value: NO_CREW, label: 'Sin cuadrilla por ahora' },
              ]}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            isDisabled={save.isPending || !name.trim()}
            onPress={() => save.mutate(undefined)}
          >
            {person ? 'Guardar cambios' : 'Añadir trabajador'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
