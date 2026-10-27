import {
  Button,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@doscientos/ui'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { clientKind, type Client, type ClientKind, type Zone } from '@/features/workspace'
import { useCommand } from '@/shared/lib/use-command'
import { ChoiceField, TextField } from '@/shared/ui/form-controls'

import { budgetsApi } from '../api'

/** "+ Nuevo …" shortcut shown under a select; the dialog lives next to it. */
function CreateShortcut({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Button variant="link" size="xs" className="self-start" onPress={onPress}>
      <Plus aria-hidden="true" className="size-3.5" /> {label}
    </Button>
  )
}

export function NewClientShortcut({ onCreated }: { onCreated: (client: Client) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ClientKind>('ayuntamiento')
  const [taxId, setTaxId] = useState('')
  const [town, setTown] = useState('')
  const [email, setEmail] = useState('')
  const save = useCommand(() => budgetsApi.createClient({ name, kind, taxId, town, email }), {
    success: (client) => ({ title: 'Cliente creado', description: client.name }),
    onSuccess: (client) => {
      onCreated(client)
      setOpen(false)
      setName('')
      setTaxId('')
      setTown('')
      setEmail('')
    },
  })

  return (
    <>
      <CreateShortcut label="Nuevo cliente" onPress={() => setOpen(true)} />
      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(28rem,calc(100vw-2rem))] rounded-xl">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>
              Queda guardado y disponible para todos los presupuestos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              className="sm:col-span-2"
              label="Nombre"
              placeholder="Ej. Ayuntamiento de Valle Alto"
              value={name}
              onChange={setName}
            />
            <ChoiceField
              label="Tipo"
              value={kind}
              onChange={(value) => setKind(value as ClientKind)}
              options={Object.entries(clientKind).map(([value, label]) => ({ value, label }))}
            />
            <TextField label="CIF / NIF" value={taxId} onChange={setTaxId} />
            <TextField label="Localidad" value={town} onChange={setTown} />
            <TextField
              label="Correo para propuestas"
              placeholder="obras@cliente.es"
              value={email}
              onChange={setEmail}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onPress={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onPress={() => save.mutate(undefined)}
              isDisabled={save.isPending || !name.trim()}
            >
              Crear cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  )
}

export function NewZoneShortcut({ onCreated }: { onCreated: (zone: Zone) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const save = useCommand(() => budgetsApi.createZone(name), {
    success: (zone) => ({ title: 'Zona creada', description: zone.name }),
    onSuccess: (zone) => {
      onCreated(zone)
      setOpen(false)
      setName('')
    },
  })

  return (
    <>
      <CreateShortcut label="Nueva zona" onPress={() => setOpen(true)} />
      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(26rem,calc(100vw-2rem))] rounded-xl">
          <DialogHeader>
            <DialogTitle>Nueva zona</DialogTitle>
            <DialogDescription>
              La zona es el monte o comarca donde se hace la obra.
            </DialogDescription>
          </DialogHeader>
          <TextField label="Nombre" placeholder="Ej. Valle Alto" value={name} onChange={setName} />
          <DialogFooter>
            <Button variant="ghost" onPress={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onPress={() => save.mutate(undefined)}
              isDisabled={save.isPending || !name.trim()}
            >
              Crear zona
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  )
}
