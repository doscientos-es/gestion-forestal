import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { seedWorkshop } from '../api'
import { AssistantPage } from './assistant'
import { BillingPage } from './billing'
import { PurchasesPage } from './inventory'
import { ProjectsPage } from './projects'

describe('pantallas de la demo de taller', () => {
  const state = seedWorkshop()
  const change = vi.fn(() => true)

  it('muestra el vehículo, piezas y costes de su proyecto', () => {
    const html = renderToStaticMarkup(
      <ProjectsPage state={state} change={change} selected="p1" select={vi.fn()} />,
    )
    expect(html).toContain('BMW M3 E36')
    expect(html).toContain('Kit de frenos competición')
    expect(html).toContain('Coste registrado')
    expect(html).not.toContain('hectáreas')
  })

  it('presenta el pedido pendiente y no confunde el borrador con una factura fiscal', () => {
    const purchases = renderToStaticMarkup(<PurchasesPage state={state} change={change} />)
    const billing = renderToStaticMarkup(<BillingPage state={state} change={change} />)
    expect(purchases).toContain('PED-001')
    expect(purchases).toContain('Revisar recepción')
    expect(billing).toContain('no son facturas fiscales')
    expect(billing).toContain('CSV debe adaptarse')
  })

  it('deja claro que el asistente no procesa audio ni documentos', () => {
    const html = renderToStaticMarkup(<AssistantPage />)
    expect(html).toContain('Sin conexión a IA')
    expect(html).toContain('no graba audio')
    expect(html).toContain('no procesa documentos')
  })
})
