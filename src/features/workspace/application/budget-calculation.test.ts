import { describe, expect, it } from 'vitest'

import { estimateBudget, validateBudget } from './budget-calculation'
import type { BudgetParams, Species } from './model'

const species: Species[] = [{ id: 'pino', name: 'Pino', kind: 'conifera', unitCost: 50 }]
const params: BudgetParams = {
  crewSize: 5,
  dailyCost: 16_000,
  travelPerCrewDay: 9_000,
  targetMargin: 0.2,
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
})

describe('validateBudget', () => {
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
