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
  const update = <K extends keyof ClientFormValues>(key: K, next: ClientFormValues[K]) =>
    onChange({ ...value, [key]: next })
  const address = value.billingAddress
  const updateAddress = (key: keyof typeof address, next: string) =>
    update('billingAddress', { ...address, [key]: next })

  return (
    <div className="grid gap-5">
      <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold">Cliente</legend>
        <TextField
          className="sm:col-span-2"
          label="Nombre del cliente *"
          required
          value={value.name}
          onChange={(next) => update('name', next)}
          placeholder="Ej. Finca Los Robles"
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
        />
      </fieldset>
      <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold">Datos de facturación</legend>
        <TextField
          className="sm:col-span-2"
          label="Razón social / nombre fiscal"
          value={value.legalName}
          onChange={(next) => update('legalName', next)}
          placeholder="Nombre completo o razón social"
          hint="Si coincide con el nombre del cliente, puedes dejarlo vacío."
        />
        <TextField
          className="sm:col-span-2"
          label="CIF / NIF"
          value={value.taxId}
          onChange={(next) => update('taxId', next)}
        />
        <TextField
          className="sm:col-span-2"
          label="Dirección de facturación"
          value={address.street}
          onChange={(next) => updateAddress('street', next)}
          placeholder="Calle, número, piso y puerta"
          autoComplete="billing street-address"
        />
        <TextField
          label="Código postal"
          value={address.postalCode}
          onChange={(next) => updateAddress('postalCode', next)}
          autoComplete="billing postal-code"
        />
        <TextField
          label="Localidad de facturación"
          value={address.city}
          onChange={(next) => updateAddress('city', next)}
          autoComplete="billing address-level2"
        />
        <TextField
          label="Provincia"
          value={address.province}
          onChange={(next) => updateAddress('province', next)}
          autoComplete="billing address-level1"
        />
        <TextField
          label="País"
          value={address.country}
          onChange={(next) => updateAddress('country', next)}
          autoComplete="billing country-name"
        />
        <p className="text-muted-foreground text-xs sm:col-span-2">
          Puedes guardar una ficha incompleta y terminar los datos antes de enviarla a la gestoría.
        </p>
      </fieldset>
      <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold">Contacto y cuenta bancaria</legend>
        <TextField
          className="sm:col-span-2"
          label="Persona de contacto"
          value={value.contactName}
          onChange={(next) => update('contactName', next)}
          autoComplete="name"
        />
        <TextField
          label="Correo para propuestas y facturas"
          type="email"
          value={value.email}
          onChange={(next) => update('email', next)}
          autoComplete="email"
        />
        <TextField
          label="Teléfono"
          type="tel"
          value={value.phone}
          onChange={(next) => update('phone', next)}
          autoComplete="tel"
        />
        <TextField
          className="sm:col-span-2"
          label="IBAN"
          value={value.iban}
          onChange={(next) => update('iban', next)}
          placeholder="ES00 0000 0000 0000 0000 0000"
          hint="Opcional. Para devoluciones y domiciliaciones."
        />
      </fieldset>
    </div>
  )
}
