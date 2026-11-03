import { describe, expect, it } from 'vitest'

import { buildSeed } from '../infrastructure/build-seed'
import {
  billingAddressLines,
  cleanClientInput,
  missingClientBillingFields,
  type ClientInput,
} from './client-details'
import { updateClient } from './client-profile'
import { createClient } from './commands'

const workspace = buildSeed('2026-11-04')
const input: ClientInput = {
  name: ' Finca del Río ',
  kind: 'particular',
  taxId: ' 12345678 z ',
  town: ' Valle Alto ',
  legalName: ' María del Río López ',
  contactName: ' María del Río ',
  email: ' maria@example.org ',
  phone: ' +34 900 000 000 ',
  billingAddress: {
    street: ' Calle Mayor, 12, 2º B ',
    postalCode: ' 01001 ',
    city: ' Vitoria-Gasteiz ',
    province: ' Álava ',
    country: ' España ',
  },
}
const context = {
  id: () => 'new-client',
  today: '2026-11-04',
  now: '2026-11-04T09:00:00Z',
  actorId: null,
}

describe('client fiscal details', () => {
  it('creates a complete fiscal recipient without confusing billing and work localities', () => {
    const { client, workspace: next } = createClient(workspace, input, context)
    expect(client).toMatchObject({
      name: 'Finca del Río',
      legalName: 'María del Río López',
      taxId: '12345678Z',
      town: 'Valle Alto',
      contactName: 'María del Río',
      email: 'maria@example.org',
      billingAddress: {
        street: 'Calle Mayor, 12, 2º B',
        postalCode: '01001',
        city: 'Vitoria-Gasteiz',
        province: 'Álava',
        country: 'España',
      },
    })
    expect(missingClientBillingFields(client)).toEqual([])
    expect(billingAddressLines(client.billingAddress)).toEqual([
      'Calle Mayor, 12, 2º B',
      '01001 Vitoria-Gasteiz',
      'Álava · España',
    ])
    expect(next.clients[0]).toEqual(client)
    expect(workspace.clients.some((item) => item.id === client.id)).toBe(false)
  })

  it('allows a lead with only a name and lists precisely what accounting is missing', () => {
    const { client } = createClient(
      workspace,
      { name: 'Nuevo contacto', kind: 'empresa', taxId: '', town: '' },
      context,
    )
    expect(client.legalName).toBe('Nuevo contacto')
    expect(client.billingAddress).toEqual({
      street: '',
      postalCode: '',
      city: '',
      province: '',
      country: 'España',
    })
    expect(missingClientBillingFields(client)).toEqual([
      'CIF / NIF',
      'dirección',
      'código postal',
      'localidad de facturación',
      'provincia',
    ])
  })

  it('keeps unspecified fiscal and contact fields on edit, but allows explicit clearing', () => {
    const { client, workspace: created } = createClient(workspace, input, context)
    const next = updateClient(created, client.id, {
      name: client.name,
      kind: client.kind,
      taxId: client.taxId,
      town: client.town,
      billingAddress: { street: 'Nueva dirección, 5' },
    })
    expect(next.clients[0]).toEqual({
      ...client,
      billingAddress: { ...client.billingAddress, street: 'Nueva dirección, 5' },
    })
    const cleared = updateClient(next, client.id, {
      ...client,
      legalName: '',
      contactName: '',
      billingAddress: { street: '', postalCode: '', city: '', province: '', country: '' },
    })
    expect(cleared.clients[0]?.legalName).toBe(client.name)
    expect(cleared.clients[0]?.contactName).toBe('')
    expect(cleared.clients[0]?.billingAddress.street).toBe('')
    expect(client.billingAddress.street).toBe('Calle Mayor, 12, 2º B')
  })

  it('rejects duplicate tax IDs in every entry point, ignoring case and spaces', () => {
    const { client, workspace: created } = createClient(workspace, input, context)
    expect(() => createClient(created, { ...input, name: 'Otro nombre' }, context)).toThrow(
      'CIF / NIF',
    )
    const other = workspace.clients[0]
    if (!other) throw new Error('Missing seed client')
    expect(() => updateClient(created, other.id, { ...other, taxId: '12345678 z' })).toThrow(
      'CIF / NIF',
    )
    expect(() => updateClient(created, client.id, input)).not.toThrow()
  })

  it.each(['España', 'ES', 'spain'])('validates Spanish postal codes for %s', (country) => {
    expect(() =>
      cleanClientInput({ ...input, billingAddress: { country, postalCode: '1001' } }, []),
    ).toThrow('5 dígitos')
    expect(cleanClientInput(input, []).billingAddress.postalCode).toBe('01001')
  })

  it('accepts international postal codes without requiring a Spanish province', () => {
    const { client } = createClient(
      workspace,
      {
        ...input,
        billingAddress: {
          street: '12 High Street',
          postalCode: 'SW1A 1AA',
          city: 'London',
          province: '',
          country: 'Reino Unido',
        },
      },
      context,
    )
    expect(missingClientBillingFields(client)).toEqual([])
  })
})
