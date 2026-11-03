import { describe, expect, it } from 'vitest'

import { formatMoney } from '@/shared/lib/format'

import { buildSeed } from '../infrastructure/build-seed'
import { estimateStoredBudget } from './budget-calculation'
import { acceptBudget, saveBudget, type Context } from './commands'
import type { Budget, BudgetLine, FreeLine, PlantingLine, TreatmentLine } from './model'
import { proposalLines } from './proposal'
import { suggestTasks } from './task-suggestions'

const workspace = buildSeed('2026-11-04')
const source = workspace.budgets[0]
const planting: PlantingLine = {
  id: 'plant',
  kind: 'plantacion',
  speciesId: 's-radiata',
  hectares: 2,
  density: 1234,
  yieldPerDay: 300,
}
const treatment: TreatmentLine = {
  id: 'treatment',
  kind: 'tratamiento',
  description: 'Desbroce',
  hectares: 2,
  hectaresPerDay: 0.6,
}
const free: FreeLine = {
  id: 'free',
  kind: 'libre',
  description: 'Vallado',
  quantity: 2.5,
  unit: 'm',
  unitPrice: 1234,
  unitCost: 450,
}
const context: Context = {
  id: () => crypto.randomUUID(),
  today: '2026-11-04',
  now: '2026-11-04T10:00:00.000Z',
  actorId: null,
}

function budget(lines: BudgetLine[]): Budget {
  if (!source) throw new Error('Missing fixture budget')
  return { ...source, id: 'test-budget', status: 'borrador', workId: null, lines }
}

describe('free-form proposal lines', () => {
  it.each([
    [free, planting, treatment],
    [planting, free, treatment],
    [planting, treatment, free],
    [free],
    [free, { ...free, id: 'second-free', unitCost: 0 }],
  ])(
    'keeps explicit prices and balances the full proposal regardless of ordering: %o',
    (...lines) => {
      const draft = budget(lines)
      const estimate = estimateStoredBudget(draft, workspace.species)
      const proposal = proposalLines(draft, workspace.species)
      expect(proposal.reduce((sum, line) => sum + line.amount, 0)).toBe(estimate.price)
      expect(proposal.every((line) => Number.isSafeInteger(line.amount) && line.amount >= 0)).toBe(
        true,
      )
      lines.forEach((line, index) => {
        if (line.kind !== 'libre') return
        expect(proposal[index]).toEqual({
          title: line.description,
          detail: `2,5 m × ${formatMoney(1234, true)}`,
          amount: 3085,
        })
        expect(proposal[index]).not.toHaveProperty('unitCost')
      })
    },
  )

  it('does not redistribute internal free-form costs onto the client proposal', () => {
    const original = budget([planting, free, treatment])
    const changed = budget([planting, { ...free, unitCost: 500_000 }, treatment])
    expect(proposalLines(changed, workspace.species)).toEqual(
      proposalLines(original, workspace.species),
    )
  })

  it('accepts free-only budgets without inventing species and suggests quantity-based tasks', () => {
    const saved = saveBudget(workspace, budget([free]), context)
    const accepted = acceptBudget(saved.workspace, saved.budget.id, context)
    expect(accepted.work.speciesIds).toEqual([])
    expect(accepted.work.planned).toMatchObject({
      price: 3085,
      totalCost: 1125,
      otherCost: 1125,
      workerDays: 0,
      hectares: 0,
    })
    expect(suggestTasks(accepted.workspace, accepted.work)).toEqual(['Vallado · 2,5 m'])
    expect(
      suggestTasks(
        {
          ...accepted.workspace,
          tasks: [
            {
              id: 'task',
              workId: accepted.work.id,
              text: 'Vallado · 2,5 m',
              createdOn: context.today,
              doneBy: null,
              doneOn: null,
            },
          ],
        },
        accepted.work,
      ),
    ).toEqual([])
  })
})
