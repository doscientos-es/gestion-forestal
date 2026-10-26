import {
  Button,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  SubmitButton,
} from '@doscientos/ui'
import { useId, useState, type FormEvent } from 'react'

import type { Customer } from '../application/customer'
import { customerInputSchema, type CustomerInput } from '../application/customer-input'
import { useCreateCustomer } from '../application/use-create-customer'

export function CustomerCreateDialog({ onCreated }: { onCreated: (customer: Customer) => void }) {
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInput, string | undefined>>>({})
  const createCustomer = useCreateCustomer()
  const fieldId = useId()

  function changeOpen(next: boolean) {
    if (createCustomer.isPending) return
    setOpen(next)
    setErrors({})
    createCustomer.reset()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (createCustomer.isPending) return
    const result = customerInputSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    )
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors({
        name: fieldErrors.name?.[0],
        contactName: fieldErrors.contactName?.[0],
        email: fieldErrors.email?.[0],
      })
      const firstField = result.error.issues[0]?.path[0]
      if (typeof firstField === 'string')
        event.currentTarget.querySelector<HTMLInputElement>(`[name="${firstField}"]`)?.focus()
      return
    }
    setErrors({})
    try {
      const customer = await createCustomer.mutateAsync(result.data)
      setOpen(false)
      onCreated(customer)
    } catch {
      // The mutation state renders a safe message; do not expose backend errors.
    }
  }

  return (
    <>
      <Button onPress={() => changeOpen(true)}>
        <span aria-hidden="true">+</span> Nuevo cliente
      </Button>
      <DialogRoot open={open} onOpenChange={changeOpen}>
        <DialogContent
          className="starter-customer-dialog"
          aria-label="Nuevo cliente de demo"
          aria-describedby={`${fieldId}-description`}
          showCloseButton={!createCustomer.isPending}
        >
          <form
            onSubmit={(event) => void submit(event)}
            aria-busy={createCustomer.isPending}
            className="grid gap-5"
          >
            <DialogHeader className="pr-8">
              <DialogTitle>Nuevo cliente de demo</DialogTitle>
              <DialogDescription id={`${fieldId}-description`}>
                Se añadirá en prueba. La ficha solo vive en esta sesión y se pierde al recargar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <Field>
                <FieldLabel htmlFor={`${fieldId}-name`}>Nombre del cliente</FieldLabel>
                <Input
                  id={`${fieldId}-name`}
                  name="name"
                  placeholder="Ej. Estudio Horizonte"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? `${fieldId}-name-error` : undefined}
                  required
                  maxLength={120}
                  disabled={createCustomer.isPending}
                />
                {errors.name ? (
                  <FieldError id={`${fieldId}-name-error`}>{errors.name}</FieldError>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor={`${fieldId}-contact`}>Persona de contacto</FieldLabel>
                <Input
                  id={`${fieldId}-contact`}
                  name="contactName"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.contactName)}
                  aria-describedby={errors.contactName ? `${fieldId}-contact-error` : undefined}
                  required
                  maxLength={120}
                  disabled={createCustomer.isPending}
                />
                {errors.contactName ? (
                  <FieldError id={`${fieldId}-contact-error`}>{errors.contactName}</FieldError>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor={`${fieldId}-email`}>Email</FieldLabel>
                <Input
                  id={`${fieldId}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? `${fieldId}-email-error` : undefined}
                  required
                  maxLength={254}
                  disabled={createCustomer.isPending}
                />
                {errors.email ? (
                  <FieldError id={`${fieldId}-email-error`}>{errors.email}</FieldError>
                ) : null}
              </Field>
              {createCustomer.isError ? (
                <FieldError role="alert">No se ha podido crear la ficha. Reinténtalo.</FieldError>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                isDisabled={createCustomer.isPending}
                onPress={() => changeOpen(false)}
              >
                Cancelar
              </Button>
              <SubmitButton loading={createCustomer.isPending} loadingLabel="Creando ficha…">
                Crear cliente de demo
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogRoot>
    </>
  )
}
