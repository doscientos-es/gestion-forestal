import { useState } from 'react'

import { clientKind, type Client, type ClientKind } from '@/features/workspace'
import { ChoiceField, TextField } from '@/shared/ui/form-controls'

export type ClientFormValues = Omit<Client, 'id'>

export function ClientFormFields({
  value,
  onChange,
}: {
  value: ClientFormValues
  onChange: (value: ClientFormValues) => void
}) {
  const [bankingOpen, setBankingOpen] = useState(Boolean(value.iban))
  const update = <K extends keyof ClientFormValues>(key: K, next: ClientFormValues[K]) =>
    onChange({ ...value, [key]: next })
  const address = value.billingAddress
  const updateAddress = (key: keyof typeof address, next: string) =>
    update('billingAddress', { ...address, [key]: next })

  return (
    <div className="grid gap-6">
      <fieldset className="grid min-w-0 gap-3.5 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold">Cliente</legend>
        <TextField
          className="sm:col-span-2"
          label="Nombre del cliente *"
          required
          value={value.name}
          onChange={(next) => update('name', next)}
          placeholder="Ej. Finca Los Robles"
          hint="El nombre que verás en listados y obras."
        />
        <ChoiceField
          label="Tipo de cliente"
          value={value.kind}
          onChange={(next) => update('kind', next as ClientKind)}
          options={Object.entries(clientKind).map(([key, label]) => ({ value: key, label }))}
        />
        <TextField
          label="Localidad de referencia"
          value={value.town}
          onChange={(next) => update('town', next)}
          placeholder="Ej. Bilbao"
        />
      </fieldset>
      <fieldset className="grid min-w-0 gap-3.5 sm:grid-cols-12">
        <legend className="mb-1 text-sm font-semibold">Datos de facturación</legend>
        <p className="text-muted-foreground mb-1 text-xs sm:col-span-12">
          Para presupuestos y facturas. Puedes completarlos más tarde.
        </p>
        <TextField
          className="sm:col-span-8"
          label="Razón social / nombre fiscal"
          value={value.legalName}
          onChange={(next) => update('legalName', next)}
          placeholder={
            value.name.trim() ||
            (value.kind === 'particular'
              ? 'Ej. Elena Robles García'
              : 'Ej. Bosques del Norte, S. L.')
          }
          hint="Déjalo vacío si coincide con el nombre del cliente."
          autoComplete={value.kind === 'particular' ? 'billing name' : 'billing organization'}
        />
        <TextField
          className="sm:col-span-4"
          label="CIF / NIF"
          value={value.taxId}
          onChange={(next) => update('taxId', next)}
          placeholder={value.kind === 'particular' ? '12345678Z' : 'B12345674'}
        />
        <TextField
          className="sm:col-span-12"
          label="Dirección de facturación"
          value={address.street}
          onChange={(next) => updateAddress('street', next)}
          placeholder="Ej. Calle del Bosque, 12, 2.º B"
          autoComplete="billing street-address"
        />
        <TextField
          className="sm:col-span-4"
          label="Código postal"
          value={address.postalCode}
          onChange={(next) => updateAddress('postalCode', next)}
          autoComplete="billing postal-code"
          placeholder="48001"
        />
        <TextField
          className="sm:col-span-8"
          label="Localidad de facturación"
          value={address.city}
          onChange={(next) => updateAddress('city', next)}
          autoComplete="billing address-level2"
          placeholder="Ej. Bilbao"
        />
        <TextField
          className="sm:col-span-6"
          label="Provincia"
          value={address.province}
          onChange={(next) => updateAddress('province', next)}
          autoComplete="billing address-level1"
          placeholder="Ej. Bizkaia"
        />
        <TextField
          className="sm:col-span-6"
          label="País"
          value={address.country}
          onChange={(next) => updateAddress('country', next)}
          autoComplete="billing country-name"
          placeholder="España"
        />
      </fieldset>
      <fieldset className="grid min-w-0 gap-3.5 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold">Contacto</legend>
        <TextField
          label="Persona de contacto"
          value={value.contactName}
          onChange={(next) => update('contactName', next)}
          autoComplete="name"
          placeholder="Ej. Elena Robles"
        />
        <TextField
          label="Teléfono"
          type="tel"
          value={value.phone}
          onChange={(next) => update('phone', next)}
          autoComplete="tel"
          placeholder="+34 600 000 000"
        />
        <TextField
          className="sm:col-span-2"
          label="Correo electrónico"
          type="email"
          value={value.email}
          onChange={(next) => update('email', next)}
          autoComplete="email"
          placeholder="administracion@cliente.es"
          hint="Para enviar propuestas y facturas."
        />
      </fieldset>
      <details
        open={bankingOpen}
        onToggle={(event) => setBankingOpen(event.currentTarget.open)}
        className="border-border rounded-lg border"
      >
        <summary className="marker:text-muted-foreground focus-visible:ring-ring cursor-pointer rounded-lg px-4 py-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
          Cuenta bancaria
          <span className="text-muted-foreground float-right text-xs font-normal">Opcional</span>
        </summary>
        <div className="px-4 pt-1 pb-4">
          <TextField
            label="IBAN"
            value={value.iban}
            onChange={(next) => update('iban', next)}
            placeholder="ES00 0000 0000 0000 0000 0000"
            hint="Solo para domiciliaciones o devoluciones."
          />
        </div>
      </details>
    </div>
  )
}
