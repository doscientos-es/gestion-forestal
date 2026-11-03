import { Link } from '@tanstack/react-router'
import { History } from 'lucide-react'
import { useState } from 'react'

import { clientWorkComparison, type Work, type Workspace } from '@/features/workspace'
import { formatMoney, formatNumber, formatPercent, formatSignedPercent } from '@/shared/lib/format'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { ChoiceField } from '@/shared/ui/form-controls'
import { Panel, PanelHeader, Stat } from '@/shared/ui/surface'

export function ClientWorkComparison({ work, workspace }: { work: Work; workspace: Workspace }) {
  const [scope, setScope] = useState('cliente')
  const comparison = clientWorkComparison(workspace, work, scope === 'zona')
  const client = workspace.clients.find((item) => item.id === work.clientId)
  const { history, current } = comparison
  const rows = [current, ...history]

  return (
    <Panel aria-labelledby="client-comparison-title" className="mt-5">
      <PanelHeader
        id="client-comparison-title"
        icon={<History className="size-5" strokeWidth={1.75} />}
        title={`Comparar con otras obras de ${client?.name ?? 'este cliente'}`}
        description="Solo obras cerradas anteriores, del mismo tipo de trabajo. Medias ponderadas por superficie o importe, no medias simples."
        action={<ChoiceField hideLabel className="w-44" label="Ámbito del histórico" value={scope} onChange={setScope} options={[{ value: 'cliente', label: 'Todo el cliente' }, { value: 'zona', label: 'Misma zona' }]} />}
      />
      {history.length === 0 ? (
        <EmptyPanel icon={<History className="size-5" />} title="Sin obras anteriores comparables" description="Se necesitan partes de una obra cerrada anterior de este cliente y del mismo tipo de trabajo. Prueba con todas las zonas." />
      ) : (
        <>
          <div className="grid gap-5 p-5 sm:grid-cols-3">
            <Stat label="Coste histórico por hectárea" value={comparison.historicalCostPerHectare === null ? '—' : formatMoney(comparison.historicalCostPerHectare, true)} hint={comparison.costPerHectareChange === null ? 'Falta superficie ejecutada para comparar' : `Esta obra: ${formatSignedPercent(comparison.costPerHectareChange, 1)} de coste/ha`} />
            <Stat label="Esfuerzo histórico por hectárea" value={comparison.historicalWorkerDaysPerHectare === null ? '—' : `${formatNumber(comparison.historicalWorkerDaysPerHectare, 1)} peonadas/ha`} hint={current.workerDaysPerHectare === null ? 'Sin superficie ejecutada en esta obra' : `Esta obra: ${formatNumber(current.workerDaysPerHectare, 1)} peonadas/ha`} />
            <Stat label="Margen histórico sobre venta" value={comparison.historicalMarginRate === null ? '—' : formatPercent(comparison.historicalMarginRate, 1)} hint={comparison.marginRateChange === null ? `${history.length} obras anteriores` : `Esta obra: ${comparison.marginRateChange > 0 ? '+' : ''}${formatNumber(comparison.marginRateChange * 100, 1)} puntos porcentuales`} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <caption className="sr-only">Obra actual e histórico comparable del cliente</caption>
              <thead><tr className="text-muted-foreground border-border border-y text-left text-xs">
                {['Obra', 'Superficie ejecutada', 'Peonadas', 'Coste/ha', 'Peonadas/ha', 'Margen operativo'].map((label) => <th key={label} scope="col" className="px-5 py-3 font-medium">{label}</th>)}
              </tr></thead>
              <tbody className="divide-border divide-y tabular-nums">
                {rows.map((row) => (
                  <tr key={row.work.id} className={row.work.id === work.id ? 'bg-muted/40' : undefined}>
                    <th scope="row" className="px-5 py-3 text-left font-medium">
                      <Link to="/obras/$workId" params={{ workId: row.work.id }} className="hover:underline">{row.work.title}</Link>
                      <span className="text-muted-foreground block text-xs font-normal">{row.work.code} · {row.work.year} · {row.work.id === work.id ? 'Esta obra' : 'Cerrada'}</span>
                    </th>
                    <td className="px-5 py-3">{row.hasData ? `${formatNumber(row.performance.hectares, 2)} ha` : '—'}</td>
                    <td className="px-5 py-3">{row.hasData ? formatNumber(row.performance.workerDays, 1) : '—'}</td>
                    <td className="px-5 py-3">{row.costPerHectare === null ? '—' : formatMoney(row.costPerHectare, true)}</td>
                    <td className="px-5 py-3">{row.workerDaysPerHectare === null ? '—' : formatNumber(row.workerDaysPerHectare, 1)}</td>
                    <td className="px-5 py-3">{row.projectedMarginRate === null ? '—' : formatPercent(row.projectedMarginRate, 1)}<span className="text-muted-foreground block text-xs">{row.finished ? 'Al cierre' : 'Previsto al terminar'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground px-5 py-4 text-xs">La obra abierta se compara al ritmo registrado. La zona, especie, densidad, terreno y precios pueden explicar diferencias; esta comparativa no los corrige.</p>
        </>
      )}
      <div className="border-border border-t px-5 py-3 text-sm"><Link to="/clientes/$clientId" params={{ clientId: work.clientId }} className="font-medium hover:underline">Ver el historial completo del cliente</Link></div>
    </Panel>
  )
}