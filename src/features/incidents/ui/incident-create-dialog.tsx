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

import {
  useCurrentUser,
  useWorkspace,
  type ServiceIncident,
  type ServiceIncidentInput,
} from '@/features/workspace'
import { useCommand } from '@/shared/lib/use-command'
import { ChoiceField, TextField } from '@/shared/ui/form-controls'

import { incidentsApi } from '../api'
import { incidentPriority } from '../application/incident-presentation'
import { IncidentTextarea } from './incident-textarea'

export function IncidentCreateDialog({
  clientId,
  onClose,
  onCreated,
}: {
  clientId?: string
  onClose: () => void
  onCreated: (incident: ServiceIncident) => void
}) {
  const workspace = useWorkspace()
  const user = useCurrentUser()
  const client = workspace.clients.find((item) => item.id === clientId)
  const [input, setInput] = useState<ServiceIncidentInput>({
    clientId: client?.id ?? '',
    title: '',
    description: '',
    location: '',
    contactName: client?.contactName ?? '',
    contactPhone: client?.phone ?? '',
    preferredTime: '',
    priority: 'normal',
    assignedTo: null,
  })
  const patch = (value: Partial<ServiceIncidentInput>) =>
    setInput((current) => ({ ...current, ...value }))
  const save = useCommand(() => incidentsApi.create(input), {
    success: 'Incidencia creada',
    onSuccess: onCreated,
  })
  return (
    <DialogRoot open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!save.isPending) save.mutate(undefined)
          }}
        >
          <DialogHeader>
            <DialogTitle>Nueva incidencia</DialogTitle>
            <DialogDescription>
              Registra el aviso del cliente y lo necesario para atenderlo.
            </DialogDescription>
          </DialogHeader>
          <fieldset disabled={save.isPending} className="my-5 space-y-4">
            <ChoiceField
              label="Cliente *"
              searchable
              value={input.clientId}
              options={workspace.clients.map((item) => ({ value: item.id, label: item.name }))}
              onChange={(value) => {
                const selected = workspace.clients.find((item) => item.id === value)
                patch({
                  clientId: value,
                  contactName: selected?.contactName ?? '',
                  contactPhone: selected?.phone ?? '',
                })
              }}
            />
            <TextField
              label="Asunto *"
              placeholder="Ej. Árbol caído en el acceso a la finca"
              value={input.title}
              onChange={(title) => patch({ title })}
              required
            />
            <IncidentTextarea
              label="Descripción del aviso *"
              value={input.description}
              onChange={(description) => patch({ description })}
              required
            />
            <TextField
              label="Ubicación de la actuación"
              placeholder="Finca, parcela o dirección"
              value={input.location}
              onChange={(location) => patch({ location })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Persona de contacto"
                value={input.contactName}
                onChange={(contactName) => patch({ contactName })}
              />
              <TextField
                label="Teléfono de contacto"
                type="tel"
                value={input.contactPhone}
                onChange={(contactPhone) => patch({ contactPhone })}
              />
            </div>
            <TextField
              label="Disponibilidad / instrucciones de acceso"
              placeholder="Ej. Llamar antes; disponible por la tarde"
              value={input.preferredTime}
              onChange={(preferredTime) => patch({ preferredTime })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceField
                label="Prioridad"
                value={input.priority}
                options={Object.entries(incidentPriority).map(([value, label]) => ({
                  value,
                  label,
                }))}
                onChange={(priority) =>
                  patch({ priority: priority as ServiceIncidentInput['priority'] })
                }
              />
              {user?.role === 'admin' ? (
                <ChoiceField
                  label="Responsable"
                  value={input.assignedTo ?? 'none'}
                  options={[
                    { value: 'none', label: 'Sin asignar' },
                    ...workspace.people.map((person) => ({ value: person.id, label: person.name })),
                  ]}
                  onChange={(value) => patch({ assignedTo: value === 'none' ? null : value })}
                />
              ) : null}
            </div>
          </fieldset>
          {save.isError ? (
            <p role="alert" className="text-destructive mb-3 text-sm">
              {save.error.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" isDisabled={save.isPending} onPress={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              isDisabled={
                save.isPending ||
                !input.clientId ||
                !input.title.trim() ||
                !input.description.trim()
              }
            >
              {save.isPending ? 'Guardando…' : 'Crear incidencia'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
