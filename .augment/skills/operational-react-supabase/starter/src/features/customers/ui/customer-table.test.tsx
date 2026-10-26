import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { Customer } from '../application/customer'
import { CustomerTable } from './customer-table'

describe('customer table accessibility contract', () => {
  const customer: Customer = {
    id: 'demo',
    name: 'Estudio Demo',
    contactName: 'Alex Demo',
    email: 'alex@example.test',
    status: 'active',
    monthlyValue: 490,
  }

  it('names the table and the per-record action and scopes column headings', () => {
    const html = renderToStaticMarkup(<CustomerTable customers={[customer]} />)
    expect(html).toContain('aria-label="Clientes que coinciden con los filtros"')
    expect(html).toContain('aria-label="Ver ficha de Estudio Demo"')
    expect(html.match(/scope="col"/g)).toHaveLength(5)
  })

  it('includes status text so that color is not the only indicator', () => {
    const html = renderToStaticMarkup(
      <CustomerTable customers={[customer, { ...customer, id: 'trial', status: 'trial' }]} />,
    )
    expect(html).toContain('Activo')
    expect(html).toContain('En prueba')
    expect(html).not.toContain('>active<')
  })
})
