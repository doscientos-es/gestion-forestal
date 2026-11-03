import { describe, expect, it } from 'vitest'

import { estimateBudget, validateBudget } from './budget-calculation'
import type { BudgetParams, FreeLine, PlantingLine, Species } from './model'

const species: Species[] = [{ id: 'pino', name: 'Pino', kind: 'conifera', unitCost: 50 }]
const params: BudgetParams = {
  crewSize: 5,
  dailyCost: 16_000,
  travelPerCrewDay: 9_000,
  targetMargin: 0.2,
}
const free: FreeLine = {
  id: 'free',
  kind: 'libre',
  description: 'Alquiler de maquinaria',
  quantity: 2.5,
  unit: 'h',
  unitPrice: 1234,
  unitCost: 450,
}
const planting: PlantingLine = {
  id: 'planting',
  kind: 'plantacion',
  speciesId: 'pino',
  hectares: 1,
  density: 400,
  yieldPerDay: 400,
}

describe('estimateBudget', () => {
  it('derives worker and crew days from plants and yield, rounding up to full crew days', () => {
    const estimate = estimateBudget(
      [
        {
          id: 'l1',
          kind: 'plantacion',
          speciesId: 'pino',
          hectares: 10,
          density: 1600,
          yieldPerDay: 400,
        },
      ],
      params,
      species,
    )
    // 16 000 plants / 400 = 40 worker days → 8 crew days of 5
    expect(estimate.plants).toBe(16_000)
    expect(estimate.crewDays).toBe(8)
    expect(estimate.workerDays).toBe(40)
    expect(estimate.laborCost).toBe(40 * 16_000)
    expect(estimate.materialCost).toBe(16_000 * 50)
    expect(estimate.travelCost).toBe(8 * 9_000)
  })

  it('charges complete crew days when the yield leaves a partial day', () => {
    const estimate = estimateBudget(
      [
        {
          id: 'l1',
          kind: 'plantacion',
          speciesId: 'pino',
          hectares: 1,
          density: 2100,
          yieldPerDay: 400,
        },
      ],
      params,
      species,
    )
    expect(estimate.crewDays).toBe(2)
    expect(estimate.workerDays).toBe(10)
  })

  it('applies the target margin over the price and rounds the price up to 10 €', () => {
    const estimate = estimateBudget(
      [
        {
          id: 'l1',
          kind: 'plantacion',
          speciesId: 'pino',
          hectares: 10,
          density: 1600,
          yieldPerDay: 400,
        },
      ],
      params,
      species,
    )
    expect(estimate.price % 1_000).toBe(0)
    expect(estimate.price).toBeGreaterThanOrEqual(estimate.totalCost / 0.8)
    expect(estimate.marginRate).toBeGreaterThanOrEqual(0.2)
    expect(estimate.marginRate).toBeLessThan(0.21)
  })

  it('combines planting with treatment lines measured in hectares per day', () => {
    const estimate = estimateBudget(
      [
        {
          id: 'l1',
          kind: 'plantacion',
          speciesId: 'pino',
          hectares: 5,
          density: 1600,
          yieldPerDay: 400,
        },
        {
          id: 'l2',
          kind: 'tratamiento',
          description: 'Desbroce',
          hectares: 5,
          hectaresPerDay: 0.5,
        },
      ],
      params,
      species,
    )
    // 20 + 10 worker days → 6 crew days
    expect(estimate.crewDays).toBe(6)
    expect(estimate.hectares).toBe(10)
  })

  it('returns zeroed figures for an empty budget', () => {
    const estimate = estimateBudget([], params, species)
    expect(estimate.price).toBe(0)
    expect(estimate.marginRate).toBe(0)
  })

  it('prices free-form quantities exactly without crew days, margin markup or forestry rounding', () => {
    const estimate = estimateBudget([free], params, species)
    expect(estimate).toMatchObject({
      price: 3085,
      fixedPrice: 3085,
      otherCost: 1125,
      totalCost: 1125,
      margin: 1960,
      hectares: 0,
      plants: 0,
      workerDays: 0,
      crewDays: 0,
      materialCost: 0,
      laborCost: 0,
      travelCost: 0,
      unitMaterialCost: 0,
    })
    expect(estimateBudget([free], { ...params, targetMargin: 0.6 }, species).price).toBe(3085)
  })

  it('adds free-form costs separately without changing forestry effort or material unit costs', () => {
    const forestry = estimateBudget([planting], params, species)
    const mixed = estimateBudget([planting, free], params, species)
    expect(mixed.price).toBe(forestry.price + 3085)
    expect(mixed.totalCost).toBe(forestry.totalCost + 1125)
    expect(mixed.margin).toBe(mixed.price - mixed.totalCost)
    for (const field of [
      'hectares',
      'plants',
      'workerDays',
      'crewDays',
      'laborCost',
      'materialCost',
      'travelCost',
      'unitMaterialCost',
    ] as const)
      expect(mixed[field]).toBe(forestry[field])
  })

  it('rounds each free-form line to cents and shows losses rather than raising its sale price', () => {
    const estimate = estimateBudget(
      [{ ...free, quantity: 1.25, unitPrice: 99, unitCost: 199 }],
      params,
      species,
    )
    expect(estimate.price).toBe(124)
    expect(estimate.totalCost).toBe(249)
    expect(estimate.margin).toBe(-125)
    expect(estimate.marginRate).toBeLessThan(0)
  })
})

describe('validateBudget', () => {
  const draft = { title: 'Servicio', clientId: 'client', zoneId: 'zone', params, lines: [free] }

  it('accepts free-only budgets and explicitly zero internal costs and sale prices', () => {
    expect(validateBudget(draft)).toEqual([])
    expect(
      validateBudget({
        ...draft,
        params: { ...params, dailyCost: 0 },
        lines: [{ ...free, unitCost: 0, unitPrice: 0 }],
      }),
    ).toEqual([])
    expect(
      validateBudget({
        ...draft,
        params: { ...params, dailyCost: 0 },
        lines: [planting, free],
      }).some((issue) => issue.field === 'dailyCost'),
    ).toBe(true)
  })

  it.each<Partial<FreeLine>>([
    { description: ' ' },
    { unit: ' ' },
    { quantity: 0 },
    { quantity: -1 },
    { quantity: Number.NaN },
    { quantity: Number.POSITIVE_INFINITY },
    { unitPrice: -1 },
    { unitCost: -1 },
    { unitPrice: 1.5 },
    { unitCost: Number.NaN },
    { unitPrice: Number.POSITIVE_INFINITY },
    { unitCost: Number.MAX_SAFE_INTEGER, quantity: 2 },
  ])('rejects invalid free-form fields: %o', (patch) => {
    expect(
      validateBudget({ ...draft, lines: [{ ...free, ...patch }] }).some(
        (issue) => issue.field === 'lines.0',
      ),
    ).toBe(true)
  })

  it('reports missing data and invalid lines', () => {
    const issues = validateBudget({
      title: ' ',
      clientId: '',
      zoneId: 'z',
      params,
      lines: [
        {
          id: 'l1',
          kind: 'plantacion',
          speciesId: 'pino',
          hectares: 0,
          density: 0,
          yieldPerDay: 0,
        },
      ],
    })
    expect(issues.map((issue) => issue.field)).toEqual(['title', 'clientId', 'lines.0', 'lines.0'])
  })
})
