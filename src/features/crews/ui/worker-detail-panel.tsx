import { Button } from '@doscientos/ui'
import { Link } from '@tanstack/react-router'

import type { WorkerPerformance } from '@/features/workspace'
import { formatDate, formatMoney, formatNumber, formatSignedPercent } from '@/shared/lib/format'
import { Panel, PanelHeader, Stat, Tag } from '@/shared/ui/surface'

export function WorkerDetailPanel({ row, previous, onClose }: {
  row: WorkerPerformance
  previous: WorkerPerformance | undefined
  onClose: () => void
}) {
  const delta = row.teamYieldDeviation !== null && previous?.teamYieldDeviation !== null && previous?.teamYieldDeviation !== undefined
    ? row.teamYieldDeviation - previous.teamYieldDeviation : null
  return (
    <Panel aria-labelledby="worker-detail-title" className="mt-5">
      <PanelHeader id="worker-detail-title" title={row.person.name} description="Actividad registrada en el periodo seleccionado." action={<Button variant="ghost" size="sm" onPress={onClose}>Cerrar detalle</Button>} />
      <div className="grid grid-cols-2 gap-5 p-5 lg:grid-cols-4">
        <Stat label="Días trabajados registrados" value={formatNumber(row.workedDays)} hint={`${row.reportCount} peonadas de parte · ${row.works.length} obras`} />
        <Stat label="Coste de personal imputado" value={formatMoney(row.laborCost)} hint={`${formatMoney(row.person.dailyCost)}/peonada · tarifa actual`} />
        <Stat label="Ritmo del equipo vs presupuesto" value={row.teamYieldDeviation === null ? '—' : formatSignedPercent(row.teamYieldDeviation, 1)} hint={delta === null ? 'Sin campaña anterior comparable' : `${delta > 0 ? '+' : ''}${formatNumber(delta * 100, 1)} puntos vs campaña anterior`} />
        <Stat label="Días con incidencias de equipo" value={formatNumber(row.incidentDays)} hint={row.lastReportOn ? `Último parte: ${formatDate(row.lastReportOn)}` : 'Sin partes'} />
      </div>
      {row.overlappingDays > 0 ? <p className="border-border border-t px-5 py-3 text-sm"><Tag tone="amber">Revisar {row.overlappingDays} días con varios partes</Tag> Cada parte imputa una jornada completa; no se interpreta como mayor productividad.</p> : null}
      {row.works.length === 0 ? <p className="text-muted-foreground px-5 py-6 text-sm">No hay participación registrada en esta campaña.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[50rem] text-sm">
            <caption className="sr-only">Obras y rendimiento de los equipos con los que ha trabajado {row.person.name}</caption>
            <thead><tr className="text-muted-foreground border-border border-y text-left text-xs">
              {['Obra', 'Peonadas', 'Coste imputado', 'Ritmo del equipo', 'Previsto', 'Desviación', 'Incidencias'].map((label) => <th key={label} scope="col" className="px-5 py-3 font-medium">{label}</th>)}
            </tr></thead>
            <tbody className="divide-border divide-y tabular-nums">
              {row.works.map((item) => <tr key={item.work.id}>
                <th scope="row" className="px-5 py-3 text-left font-medium"><Link to="/obras/$workId" params={{ workId: item.work.id }} className="hover:underline">{item.work.title}</Link><span className="text-muted-foreground block text-xs font-normal">{item.work.code} · {item.work.year}</span></th>
                <td className="px-5 py-3">{formatNumber(item.reportCount)}</td>
                <td className="px-5 py-3">{formatMoney(item.laborCost)}</td>
                <td className="px-5 py-3">{item.teamYield === null ? '—' : `${formatNumber(item.teamYield, 2)} ${item.unit}`}</td>
                <td className="px-5 py-3">{item.plannedYield > 0 ? `${formatNumber(item.plannedYield, 2)} ${item.unit}` : '—'}</td>
                <td className="px-5 py-3">{item.teamYieldDeviation === null ? '—' : formatSignedPercent(item.teamYieldDeviation, 1)}</td>
                <td className="px-5 py-3">{formatNumber(item.incidentDays)} días</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-muted-foreground border-border border-t px-5 py-4 text-xs">El rendimiento corresponde a la cuadrilla en los días en que participó esta persona, normalizado frente al presupuesto de cada obra y ponderado por sus peonadas. No mide su producción individual ni atribuye las incidencias al trabajador.</p>
    </Panel>
  )
}