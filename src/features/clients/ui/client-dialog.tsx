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
  cleanClientInput,
  clientBillingDetails,
  formatIban,
  type Client,
} from '@/features/workspace'
import { useCommand } from '@/shared/lib/use-command'

import { clientsApi } from '../api'
import { ClientFormFields, type ClientFormValues } from './client-form-fields'

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
  const [input, setInput] = useState<ClientFormValues>(() => ({
    name: client?.name ?? '',
    kind: client?.kind ?? 'ayuntamiento',
    taxId: client?.taxId ?? '',
    town: client?.town ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    iban: formatIban(client?.iban ?? ''),
    ...clientBillingDetails(client ?? { name: '' }),
  }))
  let validationError = ''
  try {
    cleanClientInput(input, [])
  } catch (error) {
    validationError = error instanceof Error ? error.message : 'Revisa los datos del cliente.'
  }
  const save = useCommand(
    async () => {
      if (client) {
        return clientsApi.update(client.id, input)
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
    <DialogRoot open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent
        className="max-h-[90dvh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-xl"
        showCloseButton={!save.isPending}
      >
        <form
          className="grid gap-5"
          aria-busy={save.isPending}
          onSubmit={(event) => {
            event.preventDefault()
            // A dialog opened from a budget must not submit the parent budget form through its portal.
            event.stopPropagation()
            if (!validationError && !save.isPending) save.mutate(undefined)
          }}
        >
          <DialogHeader>
            <DialogTitle>{client ? `Editar a ${client.name}` : 'Nuevo cliente'}</DialogTitle>
            <DialogDescription>
              Datos de contacto y facturación disponibles en toda la aplicación. * Campo
              obligatorio.
            </DialogDescription>
          </DialogHeader>
          <fieldset disabled={save.isPending} className="min-w-0">
            <ClientFormFields value={input} onChange={setInput} />
          </fieldset>
          {validationError && input.name.trim() ? (
            <p role="alert" className="text-destructive text-xs">
              {validationError}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" isDisabled={save.isPending} onPress={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isDisabled={save.isPending || Boolean(validationError)}>
              {save.isPending ? 'Guardando…' : client ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
