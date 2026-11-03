import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { BudgetDocument } from '@/features/budgets/ui/budget-document'
import { InvoiceDocument } from '@/features/invoices/ui/invoice-document'
import { buildSeed } from '@/features/workspace/infrastructure/build-seed'

import { ClientFormFields } from './client-form-fields'

const workspace = buildSeed('2026-11-04')
const client = workspace.clients.find((item) => item.id === 'c-robles')
if (!client) throw new Error('Missing private client')

describe('client billing UI', () => {
  it('exposes fiscal identity, full address and contact data in the shared create/edit fields', () => {
    const html = renderToStaticMarkup(<ClientFormFields value={client} onChange={vi.fn()} />)
    for (const label of [
      'Nombre del cliente',
      'Razón social / nombre fiscal',
      'CIF / NIF',
      'Dirección de facturación',
      'Código postal',
      'Localidad de facturación',
      'Provincia',
      'País',
      'Persona de contacto',
    ])
      expect(html).toContain(label)
    expect(html).toContain('type="email"')
    expect(html).toContain('type="tel"')
    expect(html).toMatch(/autocomplete="billing postal-code"/i)
    expect(html).toContain('value="Elena Robles García"')
  })

  it.each(['proposal', 'invoice'])(
    'prints the legal recipient and full billing address on the %s',
    (kind) => {
      const budget = workspace.budgets[0]
      const invoice = workspace.invoices[0]
      if (!budget || !invoice) throw new Error('Missing seed documents')
      const html = renderToStaticMarkup(
        kind === 'proposal' ? (
          <BudgetDocument budget={{ ...budget, clientId: client.id }} workspace={workspace} />
        ) : (
          <InvoiceDocument invoice={{ ...invoice, clientId: client.id }} workspace={workspace} />
        ),
      )
      for (const value of [
        client.legalName,
        client.name,
        client.taxId,
        client.billingAddress.street,
        client.billingAddress.postalCode,
        client.billingAddress.city,
        client.billingAddress.province,
        client.billingAddress.country,
      ])
        expect(html).toContain(value)
      expect(html).not.toContain('IBAN')
    },
  )
})
