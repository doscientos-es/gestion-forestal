import { MetricCard, MetricGrid } from '@doscientos/ui'

import {
  hasWorkProjection,
  isFinishedWork,
  type Work,
  type WorkPerformance,
} from '@/features/workspace'
import { formatMoney, formatNumber, formatPercent, formatSignedPercent } from '@/shared/lib/format'

/** Budgeted vs actual, the core comparison of the product. */
export function WorkFigures({ work, performance }: { work: Work; performance: WorkPerformance }) {
  const hasData = performance.reportCount > 0
  const finished = isFinishedWork(work)
  const canProject = hasWorkProjection(work, performance)
  const planting = work.planned.plants > 0
  const unit = planting ? 'pl/peonada' : 'ha/peonada'
  const plannedYield =
    work.planned.workerDays > 0
      ? (planting ? work.planned.plants : work.planned.hectares) / work.planned.workerDays
      : 0
  const actualYield =
    performance.workerDays > 0
      ? (planting ? performance.plants : performance.hectares) / performance.workerDays
      : 0
  const yieldDeviation = plannedYield > 0 ? actualYield / plannedYield - 1 : 0
  const marginDelta = performance.projectedMargin - performance.plannedMargin
  return (
    <MetricGrid className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Avance"
        value={hasData ? formatPercent(Math.min(performance.progress, 1)) : '—'}
        description={
          planting
            ? `${formatNumber(performance.plants)} de ${formatNumber(work.planned.plants)} plantas`
            : `${formatNumber(performance.hectares, 2)} de ${formatNumber(work.planned.hectares, 2)} ha`
        }
      />
      <MetricCard
        label="Rendimiento real"
        value={hasData ? `${formatNumber(actualYield, planting ? 0 : 2)} ${unit}` : '—'}
        description={`Presupuestado: ${formatNumber(plannedYield, planting ? 0 : 2)} ${unit}`}
        {...(hasData && plannedYield > 0
          ? {
              trend: yieldDeviation < 0 ? ('down' as const) : ('up' as const),
              delta: formatSignedPercent(yieldDeviation),
              tone: yieldDeviation < -0.03 ? ('warning' as const) : ('success' as const),
            }
          : {})}
      />
      <MetricCard
        label="Peonadas"
        value={`${formatNumber(performance.workerDays)} / ${formatNumber(work.planned.workerDays)}`}
        description={`${formatNumber(performance.crewDays)} de ${formatNumber(work.planned.crewDays)} días de cuadrilla`}
      />
      <MetricCard
        label={finished ? 'Margen operativo al cierre' : 'Margen previsto al terminar'}
        value={canProject ? formatMoney(performance.projectedMargin) : '—'}
        description={`Presupuestado ${formatMoney(performance.plannedMargin)} (${formatPercent(performance.plannedMarginRate)})`}
        {...(canProject && Math.abs(marginDelta) >= 100
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
