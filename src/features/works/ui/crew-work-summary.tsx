import { MetricCard, MetricGrid } from '@doscientos/ui'

import type { Assignment, Work, WorkPerformance } from '@/features/workspace'
import { formatNumber, formatPercent, formatShortDate } from '@/shared/lib/format'

/** What the crew needs to know: where, when and how much is left. No prices or margins. */
export function CrewWorkSummary({
  work,
  performance,
  assignment,
}: {
  work: Work
  performance: WorkPerformance
  assignment: Assignment | undefined
}) {
  const remaining = Math.max(0, work.planned.plants - performance.plants)
  return (
    <MetricGrid className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Avance"
        value={formatPercent(Math.min(performance.progress, 1))}
        description={`${formatNumber(performance.plants)} de ${formatNumber(work.planned.plants)} plantas`}
      />
      <MetricCard
        label="Plantas que faltan"
        value={formatNumber(remaining)}
        description={`Rendimiento previsto: ${formatNumber(performance.plannedYield)} pl/peón`}
      />
      <MetricCard
        label="Superficie"
        value={`${formatNumber(work.planned.hectares, 1)} ha`}
        description={`${formatNumber(work.planned.crewDays)} días de cuadrilla`}
      />
      <MetricCard
        label="Fechas"
        value={assignment ? formatShortDate(assignment.start) : 'Sin fecha'}
        description={assignment ? `hasta el ${formatShortDate(assignment.end)}` : 'Pendiente'}
      />
    </MetricGrid>
  )
}
