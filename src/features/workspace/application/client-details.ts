import { DomainError } from '@/shared/lib/errors'

import { isValidIban, normalizeIban } from './iban'
import type { BillingAddress, Client } from './model'

export type ClientInput = Pick<Client, 'name' | 'kind' | 'taxId' | 'town'> &
  Partial<Pick<Client, 'legalName' | 'contactName' | 'email' | 'phone' | 'iban'>> & {
    billingAddress?: Partial<BillingAddress>
  }

/** Defaults also upgrade older records without resetting the demo or inventing fiscal data. */
export function clientBillingDetails(input: {
  name: string
  legalName?: string
  contactName?: string
  billingAddress?: Partial<BillingAddress>
}) {
  const address = input.billingAddress
  return {
    legalName: input.legalName?.trim() || input.name.trim(),
    contactName: input.contactName?.trim() ?? '',
    billingAddress: {
      street: address?.street?.trim() ?? '',
      postalCode: address?.postalCode?.trim() ?? '',
      city: address?.city?.trim() ?? '',
      province: address?.province?.trim() ?? '',
      country: address?.country?.trim() ?? 'España',
    },
  }
}

const isSpain = (country: string) => /^(es|españa|spain)$/i.test(country.trim())
const normalizeTaxId = (taxId: string) => taxId.replace(/\s/g, '').toUpperCase()

/** Shared validation for every client entry point; omitted optional fields survive edits. */
export function cleanClientInput(
  input: ClientInput,
  clients: Client[],
  previous?: Client,
): Omit<Client, 'id'> {
  const merged = { ...previous, ...input }
  const name = input.name.trim()
  const taxId = normalizeTaxId(input.taxId)
  if (!name) throw new DomainError('Escribe el nombre del cliente.')
  const others = clients.filter((client) => client.id !== previous?.id)
  if (others.some((client) => client.name.trim().toLowerCase() === name.toLowerCase()))
    throw new DomainError('Ya existe un cliente con ese nombre.')
  if (taxId && others.some((client) => normalizeTaxId(client.taxId) === taxId))
    throw new DomainError('Ya existe un cliente con ese CIF / NIF.')
  const email = merged.email?.trim() ?? ''
  const iban = normalizeIban(merged.iban ?? '')
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new DomainError('El correo no es válido.')
  if (iban && !isValidIban(iban)) throw new DomainError('El IBAN no es válido.')
  const billing = clientBillingDetails({
    ...merged,
    billingAddress: { ...previous?.billingAddress, ...input.billingAddress },
  })
  if (
    billing.billingAddress.postalCode &&
    isSpain(billing.billingAddress.country) &&
    !/^[0-9]{5}$/.test(billing.billingAddress.postalCode)
  )
    throw new DomainError('El código postal debe tener 5 dígitos para una dirección en España.')
  return {
    name,
    kind: input.kind,
    taxId,
    town: input.town.trim(),
    email,
    phone: merged.phone?.trim() ?? '',
    iban,
    ...billing,
  }
}

export function billingAddressLines(address: BillingAddress): string[] {
  return [
    address.street,
    [address.postalCode, address.city].filter(Boolean).join(' '),
    [address.province, address.country].filter(Boolean).join(' · '),
  ].filter(Boolean)
}

/** Leads can be incomplete, but the accounting office needs a complete recipient. */
export function missingClientBillingFields(client: Client): string[] {
  const address = client.billingAddress
  return [
    !client.legalName.trim() && 'razón social / nombre fiscal',
    !client.taxId.trim() && 'CIF / NIF',
    !address.street.trim() && 'dirección',
    !address.postalCode.trim() && 'código postal',
    !address.city.trim() && 'localidad de facturación',
    isSpain(address.country) && !address.province.trim() && 'provincia',
    !address.country.trim() && 'país',
  ].filter((field): field is string => typeof field === 'string')
}
