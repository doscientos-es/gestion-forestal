import { Link } from '@tanstack/react-router'

import type { WorkProfitability } from '@/features/workspace'
import { formatDate, formatMoney, formatNumber } from '@/shared/lib/format'
import { Stat } from '@/shared/ui/surface'

type EconomicsDetailsProps = { analysis: WorkProfitability }

export function WorkCostBreakdown({ analysis }: EconomicsDetailsProps) {
  const { work, performance, hasData } = analysis
  const progress = Math.min(1, Math.max(0, performance.progress))
  const costs = [
    { label: 'Personal', planned: work.planned.laborCost, actual: performance.laborCost },
    {
      label: 'Planta y protectores',
      planned: work.planned.materialCost,
      actual: performance.materialCost,
    },
    { label: 'Desplazamientos', planned: work.planned.travelCost, actual: performance.travelCost },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Stat
          label="Coste acumulado"
          value={hasData ? formatMoney(performance.totalCost) : '—'}
          hint="Valorado a partir de los partes"
        />
        <Stat
          label="Coste por hectárea ejecutada"
          value={
            analysis.costPerHectare === null ? '—' : formatMoney(analysis.costPerHectare, true)
          }
          hint={
            work.planned.hectares > 0
              ? `Previsto: ${formatMoney(work.planned.totalCost / work.planned.hectares, true)}/ha`
              : 'Sin superficie presupuestada'
          }
        />
      </div>
      <div className="border-border overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[25rem] text-xs">
            <caption className="sr-only">Desglose de costes de la obra</caption>
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="text-right">
                <th scope="col" className="px-3 py-3 text-left font-medium">
                  Concepto
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Total previsto
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Al avance
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Acumulado
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y text-right tabular-nums">
              {costs.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="px-3 py-3 text-left font-medium">
                    {row.label}
                  </th>
                  <td className="px-3 py-3 whitespace-nowrap">{formatMoney(row.planned)}</td>
                  <td className="text-muted-foreground px-3 py-3 whitespace-nowrap">
                    {hasData ? formatMoney(Math.round(row.planned * progress)) : '—'}
                  </td>
                  <td className="px-3 py-3 font-medium whitespace-nowrap">
                    {hasData ? formatMoney(row.actual) : '—'}
                  </td>
                </tr>
              ))}
              {work.planned.otherCost ? (
                <tr>
                  <th scope="row" className="px-3 py-3 text-left font-medium">
                    Partidas libres
                  </th>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatMoney(work.planned.otherCost, true)}
                  </td>
                  <td className="text-muted-foreground px-3 py-3">Sin medición</td>
                  <td className="text-muted-foreground px-3 py-3">No registrado</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        «Al avance» es el coste presupuestado para la parte ya ejecutada, no para toda la obra.
      </p>
    </div>
  )
}

export function WorkEffortSummary({ analysis }: EconomicsDetailsProps) {
  const { work, performance, hasData } = analysis

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-x-5 gap-y-6">
        <Stat
          label="Peonadas consumidas"
          value={hasData ? formatNumber(performance.workerDays, 1) : '—'}
          hint={`${formatNumber(work.planned.workerDays, 1)} presupuestadas`}
        />
        <Stat
          label="Peonadas al terminar"
          value={
            analysis.projectedWorkerDays === null
              ? '—'
              : formatNumber(analysis.projectedWorkerDays, 1)
          }
          hint={
            analysis.remainingWorkerDays === null
              ? 'Sin avance para estimar'
              : `${formatNumber(analysis.remainingWorkerDays, 1)} pendientes estimadas`
          }
        />
        <Stat
          label="Días con actividad"
          value={hasData ? formatNumber(analysis.reportDays) : '—'}
          hint={
            analysis.startedOn ? `Desde ${formatDate(analysis.startedOn)}` : 'Sin inicio registrado'
          }
        />
        <Stat
          label="Jornadas de cuadrilla"
          value={hasData ? formatNumber(performance.crewDays) : '—'}
          hint={`${formatNumber(work.planned.crewDays)} previstas · pueden coincidir en fecha`}
        />
      </div>
      <Link
        to="/cuadrillas"
        search={{ vista: 'trabajadores' }}
        className="text-brand inline-block text-xs font-medium underline underline-offset-4"
      >
        Consultar la actividad de cada trabajador
      </Link>
    </div>
  )
}

export function WorkCollectionsSummary({ analysis }: EconomicsDetailsProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">
        <Stat
          label="Facturado sin IVA"
          value={formatMoney(analysis.invoiced)}
          hint="No incluye borradores"
        />
        <Stat
          label="Cobrado sin IVA"
          value={formatMoney(analysis.collected)}
          hint={`${formatMoney(analysis.invoiced - analysis.collected)} por cobrar`}
        />
      </div>
      <div className="border-border bg-muted/20 rounded-lg border p-4">
        <h3 className="text-xs font-medium">Justificantes de gastos · con IVA</h3>
        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Aprobados</dt>
            <dd className="font-medium tabular-nums">{formatMoney(analysis.approvedExpenses)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Pendientes de revisión</dt>
            <dd className="font-medium tabular-nums">{formatMoney(analysis.pendingExpenses)}</dd>
          </div>
        </dl>
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
          Se muestran aparte para no duplicar costes ya valorados en los partes.
        </p>
      </div>
    </div>
  )
}
