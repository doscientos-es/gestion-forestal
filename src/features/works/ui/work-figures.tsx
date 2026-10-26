import { MetricCard, MetricGrid } from '@doscientos/ui'

import type { Work, WorkPerformance } from '@/features/workspace'
import { formatMoney, formatNumber, formatPercent, formatSignedPercent } from '@/shared/lib/format'

/** Budgeted vs actual, the core comparison of the product. */
export function WorkFigures({ work, performance }: { work: Work; performance: WorkPerformance }) {
  const hasData = performance.workerDays > 0
  const finished = work.status === 'terminada' || work.status === 'facturada'
  const marginDelta = performance.projectedMargin - performance.plannedMargin
  return (
    <MetricGrid className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Avance"
        value={formatPercent(Math.min(performance.progress, 1))}
        description={`${formatNumber(performance.plants)} de ${formatNumber(work.planned.plants)} plantas`}
      />
      <MetricCard
        label="Rendimiento real"
        value={hasData ? `${formatNumber(performance.actualYield)} pl/peón` : '—'}
        description={`Presupuestado: ${formatNumber(performance.plannedYield)} pl/peón`}
        {...(hasData
          ? {
              trend: performance.yieldDeviation < 0 ? ('down' as const) : ('up' as const),
              delta: formatSignedPercent(performance.yieldDeviation),
              tone:
                performance.yieldDeviation < -0.03 ? ('warning' as const) : ('success' as const),
            }
          : {})}
      />
      <MetricCard
        label="Peonadas"
        value={`${formatNumber(performance.workerDays)} / ${formatNumber(work.planned.workerDays)}`}
        description={`${formatNumber(performance.crewDays)} de ${formatNumber(work.planned.crewDays)} días de cuadrilla`}
      />
      <MetricCard
        label={finished ? 'Margen final' : 'Margen previsto al terminar'}
        value={formatMoney(performance.projectedMargin)}
        description={`Presupuestado ${formatMoney(performance.plannedMargin)} (${formatPercent(performance.plannedMarginRate)})`}
        {...(hasData && Math.abs(marginDelta) >= 100
          ? {
              trend: marginDelta < 0 ? ('down' as const) : ('up' as const),
              delta: formatMoney(marginDelta),
              tone: marginDelta < 0 ? ('warning' as const) : ('success' as const),
            }
          : {})}
      />
    </MetricGrid>
  )
}
