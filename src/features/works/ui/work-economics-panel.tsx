import { Link } from '@tanstack/react-router'

import type { WorkProfitability } from '@/features/workspace'
import { formatDate, formatMoney, formatNumber, formatPercent } from '@/shared/lib/format'
import { Panel, PanelHeader, Stat, Tag } from '@/shared/ui/surface'

export function WorkEconomicsPanel({ analysis }: { analysis: WorkProfitability }) {
  const { work, performance, hasData } = analysis
  const progress = Math.min(1, Math.max(0, performance.progress))
  const costs = [
    { label: 'Personal', planned: work.planned.laborCost, actual: performance.laborCost },
    { label: 'Planta y protectores', planned: work.planned.materialCost, actual: performance.materialCost },
    { label: 'Desplazamientos', planned: work.planned.travelCost, actual: performance.travelCost },
  ]

  return (
    <Panel aria-labelledby="economics-title">
      <PanelHeader
        id="economics-title"
        title="Rentabilidad y esfuerzo de la obra"
        description="Coste de los partes frente al presupuesto correspondiente al avance ejecutado."
        meta={<Tag tone={analysis.finished ? 'green' : 'blue'}>{analysis.finished ? 'Cierre operativo' : 'Estimación'}</Tag>}
      />
      <div className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-3">
        <Stat label="Precio contratado" value={formatMoney(work.planned.price)} hint="Sin IVA" />
        <Stat label="Coste acumulado" value={hasData ? formatMoney(performance.totalCost) : '—'} hint={hasData ? `${performance.reportCount} partes` : 'Todavía no hay partes'} />
        <Stat label="Desviación al mismo avance" value={analysis.costDeviation === null ? '—' : formatMoney(analysis.costDeviation)} hint="Positivo = sobrecoste frente al avance" />
        <Stat label="Coste al terminar" value={analysis.projectedCost === null ? '—' : formatMoney(analysis.projectedCost)} hint={`Presupuesto: ${formatMoney(work.planned.totalCost)}`} />
        <Stat label="Margen operativo" value={analysis.projectedMargin === null ? '—' : formatMoney(analysis.projectedMargin)} hint={analysis.projectedMarginRate === null ? 'Sin base para estimar' : `${formatPercent(analysis.projectedMarginRate, 1)} sobre venta`} />
        <Stat label="Coste por hectárea ejecutada" value={analysis.costPerHectare === null ? '—' : formatMoney(analysis.costPerHectare, true)} hint={work.planned.hectares > 0 ? `Previsto: ${formatMoney(work.planned.totalCost / work.planned.hectares, true)}/ha` : 'Sin superficie presupuestada'} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <caption className="sr-only">Desglose de costes de la obra</caption>
          <thead>
            <tr className="text-muted-foreground border-border border-y text-right text-xs">
              <th scope="col" className="px-5 py-3 text-left">Concepto</th>
              <th scope="col" className="px-5 py-3">Presupuesto total</th>
              <th scope="col" className="px-5 py-3">Previsto al avance</th>
              <th scope="col" className="px-5 py-3">Acumulado</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y text-right tabular-nums">
            {costs.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="px-5 py-3 text-left font-medium">{row.label}</th>
                <td className="px-5 py-3">{formatMoney(row.planned)}</td>
                <td className="px-5 py-3">{hasData ? formatMoney(Math.round(row.planned * progress)) : '—'}</td>
                <td className="px-5 py-3">{hasData ? formatMoney(row.actual) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-border grid grid-cols-2 gap-5 border-t p-5 sm:grid-cols-3">
        <Stat label="Días con actividad" value={hasData ? formatNumber(analysis.reportDays) : '—'} hint={analysis.startedOn ? `Desde ${formatDate(analysis.startedOn)}` : 'Sin inicio registrado'} />
        <Stat label="Peonadas consumidas" value={hasData ? formatNumber(performance.workerDays, 1) : '—'} hint={`${formatNumber(work.planned.workerDays, 1)} presupuestadas`} />
        <Stat label="Peonadas al terminar" value={analysis.projectedWorkerDays === null ? '—' : formatNumber(analysis.projectedWorkerDays, 1)} hint={analysis.remainingWorkerDays === null ? 'Sin avance para estimar' : `${formatNumber(analysis.remainingWorkerDays, 1)} pendientes estimadas`} />
        <Stat label="Jornadas de cuadrilla" value={hasData ? formatNumber(performance.crewDays) : '—'} hint={`${formatNumber(work.planned.crewDays)} previstas · pueden coincidir en fecha`} />
        <Stat label="Facturado sin IVA" value={formatMoney(analysis.invoiced)} hint="No incluye borradores" />
        <Stat label="Cobrado sin IVA" value={formatMoney(analysis.collected)} hint={`${formatMoney(analysis.invoiced - analysis.collected)} por cobrar`} />
      </div>
      <div className="border-border bg-muted/30 space-y-2 border-t px-5 py-4 text-xs">
        <p>Gastos aprobados: <strong>{formatMoney(analysis.approvedExpenses)}</strong> · Pendientes de revisión: <strong>{formatMoney(analysis.pendingExpenses)}</strong>.</p>
        <p className="text-muted-foreground">Los justificantes incluyen IVA y se muestran aparte: no se suman automáticamente porque pueden corresponder a material o transporte ya valorado. El margen no incluye gastos generales ni ajustes fiscales.</p>
        <p className="text-muted-foreground">Personal valorado a la tarifa diaria actual; planta y transporte a precios del presupuesto. No son costes históricos de nómina ni facturas conciliadas.</p>
        <Link to="/cuadrillas" search={{ vista: 'trabajadores' }} className="inline-block font-medium underline">Consultar la actividad de cada trabajador</Link>
      </div>
    </Panel>
  )
}