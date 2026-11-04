import { describe, expect, it } from 'vitest'

import { seedWorkshop } from '../infrastructure/seed'
import {
  addPart,
  addProject,
  addQuoteLine,
  approveProject,
  createInvoice,
  projectCosts,
  quoteTotal,
  receivePurchase,
  updateQuoteLine,
} from './workshop'

describe('recorrido del taller', () => {
  it('conecta presupuesto, intervención, costes y borrador sin facturar dos veces', () => {
    let state = seedWorkshop()
    state = addProject(state, {
      id: 'new',
      reference: 'RR-TEST',
      client: 'Cliente',
      vehicle: 'Vehículo',
      plate: 'TEST',
      title: 'Revisión',
      status: 'presupuesto',
      lines: [],
    })
    expect(() => approveProject(state, 'new')).toThrow()
    const line = {
      id: 'line',
      description: 'Trabajo',
      kind: 'mano de obra' as const,
      supplier: '',
      quantity: 2,
      price: 5500,
    }
    state = addQuoteLine(state, 'new', line)
    state = updateQuoteLine(state, 'new', { ...line, quantity: 3 })
    state = approveProject(state, 'new')
    expect(() => addQuoteLine(state, 'new', line)).toThrow()
    state = addPart(state, {
      id: 'part',
      projectId: 'new',
      date: '2026-11-04',
      worker: 'Operario',
      description: 'Montaje',
      hours: 2,
      hourlyCost: 2400,
      productId: 'a2',
      quantity: 2,
      expense: 500,
    })
    expect(state.products.find((product) => product.id === 'a2')?.stock).toBe(1)
    expect(projectCosts(state.parts, 'new')).toEqual({
      hours: 2,
      labor: 4800,
      materials: 17000,
      expenses: 500,
    })
    state = createInvoice(state, {
      id: 'invoice',
      projectId: 'new',
      date: '2026-11-04',
      lines: [],
      paid: false,
    })
    expect(quoteTotal(state.invoices[0]?.lines ?? [])).toBe(16500)
    expect(() =>
      createInvoice(state, {
        id: 'second',
        projectId: 'new',
        date: '2026-11-04',
        lines: [],
        paid: false,
      }),
    ).toThrow()
  })

  it('no descuenta stock si no hay suficiente o el proyecto no está en taller', () => {
    const state = seedWorkshop()
    const part = {
      id: 'part',
      projectId: 'p1',
      date: '2026-11-04',
      worker: 'Operario',
      description: 'Montaje',
      hours: 1,
      hourlyCost: 2400,
      productId: 'a1',
      quantity: 2,
      expense: 0,
    }
    expect(() => addPart(state, part)).toThrow('cantidad disponible')
    expect(() => addPart(state, { ...part, projectId: 'p2', quantity: 1 })).toThrow(
      'proyecto en taller',
    )
    expect(state.products.find((product) => product.id === 'a1')?.stock).toBe(1)
  })

  it('exige confirmar discrepancias y evita recibir el pedido dos veces', () => {
    const state = seedWorkshop()
    expect(() => receivePurchase(state, 'o1', 1, false)).toThrow('Confirma la diferencia')
    expect(state.products.find((product) => product.id === 'a1')?.stock).toBe(1)
    const received = receivePurchase(state, 'o1', 1, true)
    expect(received.products.find((product) => product.id === 'a1')?.stock).toBe(2)
    expect(received.purchases[0]).toMatchObject({ status: 'recibido', received: 1 })
    expect(() => receivePurchase(received, 'o1', 1, true)).toThrow('ya se ha recibido')
  })
})
