import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { workProfitability, type Work, type Workspace } from '@/features/workspace'
import { buildSeed } from '@/features/workspace/infrastructure/build-seed'
import { formatMoney, formatNumber } from '@/shared/lib/format'

import {
  WorkCollectionsSummary,
  WorkCostBreakdown,
  WorkEffortSummary,
} from './work-economics-details'
import { WorkEconomicsPanel } from './work-economics-panel'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))

const seed = buildSeed('2026-11-03')
const original = seed.works[0]
const sourceReport = seed.reports[0]
if (!original || !sourceReport) throw new Error('Missing economics fixtures')
const work: Work = {
  ...original,
  status: 'en_curso',
  planned: {
    ...original.planned,
    plants: 1000,
    hectares: 10,
    laborCost: 100_000,
    materialCost: 10_000,
    travelCost: 5000,
    otherCost: 0,
    totalCost: 115_000,
    price: 150_000,
  },
}
const workspace: Workspace = {
  ...seed,
  works: [work],
  reports: [{ ...sourceReport, workId: work.id, plants: 200, hectares: 2 }],
  invoices: [],
  expenses: [],
}
const analysis = workProfitability(workspace, work)

describe('work economics presentation', () => {
  it('prioritizes the forecast and opens only the cost detail by default', () => {
    const html = renderToStaticMarkup(<WorkEconomicsPanel analysis={analysis} />)
    expect(html).toContain('Rentabilidad de la obra')
    expect(html).toContain('Margen operativo')
    expect(html).toContain('Coste al terminar')
    expect(html).toContain('Desviación al avance')
    expect(html).toContain('aria-label="Detalle económico de la obra"')
    const costsTab = html.match(/<[^>]+>Costes<\//)?.[0] ?? ''
    expect(costsTab).toContain('role="tab"')
    expect(costsTab).toContain('aria-selected="true"')
    expect(html).toContain('Desglose de costes de la obra')
    expect(html).not.toContain('Peonadas consumidas')
    expect(html).not.toContain('Facturado sin IVA')
    expect(html).toContain('aria-valuenow="20"')
  })

  it.each(['en_curso', 'terminada'] as const)(
    'does not imply profit or operational closure without reports in %s',
    (status) => {
      const current = { ...work, status }
      const empty = workProfitability({ ...workspace, reports: [] }, current)
      const html = renderToStaticMarkup(<WorkEconomicsPanel analysis={empty} />)
      expect(html).toContain('Sin partes')
      expect(html).toContain('Añade el primer parte')
      expect(html).not.toContain('Cierre operativo')
      expect(html).not.toContain('Dentro del margen previsto')
      expect(html).toMatch(/Margen operativo<\/p><p[^>]*>—<\/p>/)
    },
  )

  it('keeps incurred costs visible when zero progress prevents a closing forecast', () => {
    const stalled = workProfitability(
      {
        ...workspace,
        reports: workspace.reports.map((report) => ({ ...report, plants: 0, hectares: 0 })),
      },
      work,
    )
    const html = renderToStaticMarkup(<WorkEconomicsPanel analysis={stalled} />)
    expect(html).toContain('Los partes aún no registran avance suficiente')
    expect(html).toContain(formatMoney(stalled.performance.totalCost))
    expect(html).toMatch(/Margen operativo<\/p><p[^>]*>—<\/p>/)
  })

  it.each([
    [-1000, 'Previsión de pérdidas', 'border-red-200'],
    [10_000, 'Por debajo del margen previsto', 'border-amber-200'],
    [35_000, 'Dentro del margen previsto', 'border-emerald-200'],
  ] as const)('explains a margin of %s in text as well as color', (margin, label, color) => {
    const html = renderToStaticMarkup(
      <WorkEconomicsPanel
        analysis={{
          ...analysis,
          projectedMargin: margin,
          projectedMarginRate: margin / work.planned.price,
          projectedCost: work.planned.price - margin,
        }}
      />,
    )
    expect(html).toContain(label)
    expect(html).toContain(color)
    expect(html).toContain(formatMoney(margin))
  })

  it('keeps unmeasured free-form costs and calculation caveats without expanding the notes', () => {
    const current = { ...work, planned: { ...work.planned, otherCost: 12_345, totalCost: 127_345 } }
    const result = workProfitability(workspace, current)
    const costs = renderToStaticMarkup(<WorkCostBreakdown analysis={result} />)
    expect(costs).toContain('Partidas libres')
    expect(costs).toContain(formatMoney(12_345, true))
    expect(costs).toContain('Sin medición')
    expect(costs).toContain('No registrado')
    const html = renderToStaticMarkup(<WorkEconomicsPanel analysis={result} />)
    const notes = html.match(/<details[^>]*>[\s\S]*?<\/details>/)?.[0] ?? ''
    expect(notes).toContain('Cómo se calculan estas cifras')
    expect(notes).toContain('no se incluyen en el coste acumulado')
    expect(notes).not.toMatch(/<details[^>]*open/)
  })

  it('preserves recorded effort and remaining effort in their own view', () => {
    const html = renderToStaticMarkup(<WorkEffortSummary analysis={analysis} />)
    expect(html).toContain('Peonadas consumidas')
    expect(html).toContain('Jornadas de cuadrilla')
    expect(html).toContain(
      `${formatNumber(analysis.remainingWorkerDays ?? 0, 1)} pendientes estimadas`,
    )
    expect(html).toContain('Consultar la actividad de cada trabajador')
    expect(html).not.toContain('Facturado sin IVA')
  })

  it('separates net collections from gross receipts and preserves pending amounts', () => {
    const html = renderToStaticMarkup(
      <WorkCollectionsSummary
        analysis={{
          ...analysis,
          invoiced: 100_000,
          collected: 40_000,
          approvedExpenses: 12_345,
          pendingExpenses: 2345,
        }}
      />,
    )
    expect(html).toContain('Facturado sin IVA')
    expect(html).toContain('Cobrado sin IVA')
    expect(html).toContain(`${formatMoney(60_000)} por cobrar`)
    expect(html).toContain('Justificantes de gastos · con IVA')
    expect(html).toContain(formatMoney(12_345))
    expect(html).toContain(formatMoney(2345))
    expect(html).toContain('para no duplicar costes')
  })
})
