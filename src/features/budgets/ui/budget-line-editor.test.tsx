import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { estimateBudget, type Budget, type BudgetLine } from '@/features/workspace'
import { buildSeed } from '@/features/workspace/infrastructure/build-seed'
import { formatMoney } from '@/shared/lib/format'

import {
  DEFAULT_PARAMS,
  duplicateDraft,
  newFreeLine,
  newPlantingLine,
  newTreatmentLine,
  updateLine,
} from '../application/budget-draft'
import { BudgetDocument } from './budget-document'
import { BudgetLineEditor } from './budget-line-editor'
import { BudgetPreview } from './budget-preview'

const workspace = buildSeed('2026-11-04')
const free = {
  ...newFreeLine(),
  description: 'Alquiler de maquinaria',
  quantity: 2.5,
  unit: 'h',
  unitPrice: 1234,
  unitCost: 450,
}

function renderLine(line: BudgetLine) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <ul>
        <BudgetLineEditor
          index={0}
          line={line}
          workspace={workspace}
          estimate={estimateBudget([line], DEFAULT_PARAMS, workspace.species).lines[0]}
          onChange={vi.fn()}
          onRemove={vi.fn()}
        />
      </ul>
    </QueryClientProvider>,
  )
}

describe('compact budget lines', () => {
  it('offers quantity, unit and price for free-form lines without hectare or yield inputs', () => {
    const html = renderLine(free)
    for (const label of [
      'Concepto',
      'Cantidad',
      'Unidad',
      'Precio unitario sin IVA',
      'Quitar partida 1',
    ])
      expect(html).toContain(label)
    expect(html).toContain(formatMoney(3085, true))
    expect(html).not.toContain('Superficie')
    expect(html).not.toContain('Rendimiento')
    const options = html.match(/<details[^>]*>[\s\S]*?<\/details>/)?.[0] ?? ''
    expect(options).toContain('Coste interno por unidad')
    expect(options).toContain('No aparece en la propuesta')
    expect(options).not.toMatch(/<details[^>]*open/)
  })

  it.each([newPlantingLine(workspace), newTreatmentLine()])(
    'keeps forestry yield editable in closed options: $kind',
    (line) => {
      const html = renderLine(line)
      const options = html.match(/<details[^>]*>[\s\S]*?<\/details>/)?.[0] ?? ''
      expect(html).toContain('Superficie')
      expect(options).toContain('Rendimiento')
      expect(options).not.toMatch(/<details[^>]*open/)
      expect(html).not.toContain('Precio unitario sin IVA')
    },
  )

  it('shows exact prices and free-form costs in the summary without invented crew days or surface', () => {
    const html = renderToStaticMarkup(
      <BudgetPreview estimate={estimateBudget([free], DEFAULT_PARAMS, workspace.species)} />,
    )
    expect(html).toContain(formatMoney(3085, true))
    expect(html).toContain(formatMoney(1125, true))
    expect(html).toContain('Partidas libres')
    expect(html).not.toContain('con una cuadrilla')
    expect(html).not.toContain('/ha')
  })

  it('prints free-form quantities and exact totals but never the internal cost or zero crew days', () => {
    const source = workspace.budgets[0]
    if (!source) throw new Error('Missing fixture budget')
    const budget: Budget = { ...source, lines: [free] }
    const html = renderToStaticMarkup(<BudgetDocument budget={budget} workspace={workspace} />)
    expect(html).toContain(free.description)
    expect(html).toContain('2,5 h × ' + formatMoney(1234, true))
    expect(html).toContain(formatMoney(3085, true))
    expect(html).not.toContain('Coste interno')
    expect(html).not.toContain(formatMoney(450, true))
    expect(html).not.toContain('días de cuadrilla')
  })

  it('duplicates all free-form fields with fresh ids and updates only the targeted line immutably', () => {
    const source = workspace.budgets[0]
    if (!source) throw new Error('Missing fixture budget')
    const copy = duplicateDraft({ ...source, lines: [free, newTreatmentLine()] }, '2026-11-05')
    expect(copy.lines[0]).toEqual({ ...free, id: copy.lines[0]?.id })
    expect(copy.lines[0]?.id).not.toBe(free.id)
    const copiedLine = copy.lines[0]
    if (!copiedLine) throw new Error('Missing copied line')
    const changed = updateLine(copy.lines, copiedLine.id, { quantity: 4 })
    expect(changed[0]).toMatchObject({
      quantity: 4,
      unitPrice: free.unitPrice,
      unitCost: free.unitCost,
    })
    expect(copy.lines[0]).toMatchObject({ quantity: 2.5 })
    expect(changed[1]).toBe(copy.lines[1])
  })
})
