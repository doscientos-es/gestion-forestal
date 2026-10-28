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
  clientKind,
  formatIban,
  isValidIban,
  type Client,
  type ClientKind,
} from '@/features/workspace'
import { useCommand } from '@/shared/lib/use-command'
import { ChoiceField, TextField } from '@/shared/ui/form-controls'

import { clientsApi } from '../api'

/** Creates a client, or edits all the details of an existing one. */
export function ClientDialog({
  client,
  onClose,
  onSaved,
}: {
  client?: Client
  onClose: () => void
  onSaved?: (client: Client) => void
}) {
  const [name, setName] = useState(client?.name ?? '')
  const [kind, setKind] = useState<ClientKind>(client?.kind ?? 'ayuntamiento')
  const [taxId, setTaxId] = useState(client?.taxId ?? '')
  const [town, setTown] = useState(client?.town ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [iban, setIban] = useState(formatIban(client?.iban ?? ''))
  const ibanInvalid = iban.trim() !== '' && !isValidIban(iban)
  const input = { name, kind, taxId, town, email, phone, iban }
  const save = useCommand(
    async () => {
      if (client) {
        await clientsApi.update(client.id, input)
        return client
      }
      return clientsApi.create(input)
    },
    {
      success: (saved) => ({
        title: client ? 'Datos guardados' : 'Cliente creado',
        description: saved.name,
      }),
      onSuccess: (saved) => {
        onSaved?.(saved)
        onClose()
      },
    },
  )

  return (
    <DialogRoot open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))] rounded-xl">
        <DialogHeader>
          <DialogTitle>{client ? `Editar a ${client.name}` : 'Nuevo cliente'}</DialogTitle>
          <DialogDescription>
            El correo recibe propuestas y facturas; el IBAN sirve para devoluciones y domiciliaciones.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField className="sm:col-span-2" label="Nombre" value={name} onChange={setName} />
          <ChoiceField
            label="Tipo"
            value={kind}
            onChange={(value) => setKind(value as ClientKind)}
            options={Object.entries(clientKind).map(([value, label]) => ({ value, label }))}
          />
          <TextField label="CIF / NIF" value={taxId} onChange={setTaxId} />
          <TextField label="Localidad" value={town} onChange={setTown} />
          <TextField
            label="Teléfono"
            placeholder="+34 900 000 000"
            value={phone}
            onChange={setPhone}
          />
          <TextField
            className="sm:col-span-2"
            label="Correo"
            placeholder="obras@cliente.es"
            value={email}
            onChange={setEmail}
          />
          <TextField
            className="sm:col-span-2"
            label="IBAN"
            placeholder="ES00 0000 0000 0000 0000 0000"
            value={iban}
            onChange={setIban}
            invalid={ibanInvalid}
          />
          {ibanInvalid ? (
            <p role="alert" className="text-destructive text-xs sm:col-span-2">
              El IBAN no es válido. Revisa que no falte ningún dígito.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            isDisabled={save.isPending || ibanInvalid || !name.trim()}
            onPress={() => save.mutate(undefined)}
          >
            {client ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
