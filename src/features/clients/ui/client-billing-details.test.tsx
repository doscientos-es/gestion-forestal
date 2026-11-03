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
    expect(html).toContain('placeholder="12345678Z"')
    expect(html).toContain('placeholder="48001"')
    expect(html).toContain('placeholder="administracion@cliente.es"')
    expect(html).toContain('aria-describedby=')
  })

  it('suggests the display name for billing and adapts the tax example for companies', () => {
    const html = renderToStaticMarkup(
      <ClientFormFields
        value={{ ...client, kind: 'empresa', name: 'Bosques del Norte', legalName: '' }}
        onChange={vi.fn()}
      />,
    )
    expect(html).toContain('placeholder="Bosques del Norte"')
    expect(html).toContain('placeholder="B12345674"')
    expect(html).toMatch(/autocomplete="billing organization"/i)
    expect(html).toContain('Déjalo vacío si coincide con el nombre del cliente.')
  })

  it.each(['', 'ES9121000418450200051332'])(
    'keeps banking optional and reveals saved accounts: %s',
    (iban) => {
      const html = renderToStaticMarkup(
        <ClientFormFields value={{ ...client, iban }} onChange={vi.fn()} />,
      )
      const disclosure = html.match(/<details[^>]*>/)?.[0]
      expect(disclosure).toBeDefined()
      expect(disclosure?.includes('open=""')).toBe(Boolean(iban))
      expect(html).toContain('Cuenta bancaria')
      expect(html).toContain('Opcional')
    },
  )

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
