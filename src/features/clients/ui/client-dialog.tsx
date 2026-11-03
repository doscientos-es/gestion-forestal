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
  const [submitted, setSubmitted] = useState(false)
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
        className="max-h-[calc(100dvh-2rem)] w-[min(42rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-xl p-0"
        showCloseButton={!save.isPending}
      >
        <form
          className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col"
          aria-busy={save.isPending}
          onSubmit={(event) => {
            event.preventDefault()
            // A dialog opened from a budget must not submit the parent budget form through its portal.
            event.stopPropagation()
            setSubmitted(true)
            if (!validationError && !save.isPending) save.mutate(undefined)
          }}
        >
          <DialogHeader className="border-border shrink-0 border-b px-5 py-5 sm:px-6">
            <DialogTitle>{client ? `Editar a ${client.name}` : 'Nuevo cliente'}</DialogTitle>
            <DialogDescription>
              {client
                ? 'Actualiza sus datos de contacto y facturación.'
                : 'Una ficha para tus presupuestos, obras y facturas.'}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            <fieldset disabled={save.isPending} className="min-w-0">
              <ClientFormFields value={input} onChange={setInput} />
            </fieldset>
          </div>
          <div className="border-border bg-muted/20 shrink-0 border-t px-5 py-4 sm:px-6">
            {submitted && validationError ? (
              <p role="alert" className="text-destructive mb-3 text-sm">
                {validationError}
              </p>
            ) : null}
            <DialogFooter className="items-center sm:justify-between">
              <p className="text-muted-foreground text-xs">* Solo el nombre es obligatorio</p>
              <div className="flex w-full justify-end gap-2 sm:w-auto">
                <Button type="button" variant="ghost" isDisabled={save.isPending} onPress={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" isDisabled={save.isPending || !input.name.trim()}>
                  {save.isPending ? 'Guardando…' : client ? 'Guardar cambios' : 'Crear cliente'}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
