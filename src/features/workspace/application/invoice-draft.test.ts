import { describe, expect, it } from 'vitest'

import { parseCsv } from '@/shared/lib/csv'

import { buildSeed } from '../infrastructure/build-seed'
import { invoicesToCsv } from './invoice-draft'
import { accountingLookup } from './labels'

describe('accounting recipient export', () => {
  it('preserves fiscal details, leading zeroes, quotes, separators and multiline addresses', () => {
    const workspace = buildSeed('2026-11-04')
    const invoice = workspace.invoices[0]
    const client = workspace.clients.find((item) => item.id === invoice?.clientId)
    if (!invoice || !client) throw new Error('Missing fixtures')
    const recipient = {
      ...client,
      name: 'Finca Los Robles',
      legalName: 'Elena "Robles"; García',
      billingAddress: {
        street: 'Calle Mayor, 12; oficina "A"\n2º B',
        postalCode: '01001',
        city: 'Vitoria-Gasteiz',
        province: 'Álava',
        country: 'España',
      },
      contactName: '=1+1',
    }
    const rows = parseCsv(
      invoicesToCsv([invoice], accountingLookup({ ...workspace, clients: [recipient] })),
    )
    const [header, row] = rows
    const field = (name: string) => row?.[header?.indexOf(name) ?? -1]
    expect(row).toHaveLength(header?.length ?? 0)
    expect(field('Cliente')).toBe(recipient.legalName)
    expect(field('Nombre comercial')).toBe(recipient.name)
    expect(field('Dirección de facturación')).toBe(recipient.billingAddress.street)
    expect(field('Código postal')).toBe('01001')
    expect(field('Provincia')).toBe('Álava')
    expect(field('Persona de contacto')).toBe("'=1+1")
  })
})
