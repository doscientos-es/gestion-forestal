import { ChartColumn } from 'lucide-react'

import type { ClientYear } from '@/features/workspace'
import { formatMoney, formatNumber, formatPercent } from '@/shared/lib/format'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

/** What the client contracted and what it left us each campaign, with the margin trend. */
export function ClientCampaignsPanel({ years }: { years: ClientYear[] }) {
  if (years.length === 0) return null
  return (
    <Panel aria-labelledby="client-campaigns-title" className="mb-5">
      <PanelHeader
        id="client-campaigns-title"
        icon={<ChartColumn className="size-5" strokeWidth={1.75} />}
        title="Campaña a campaña"
        description="Contratado y margen de cada año; el margen de las obras abiertas se estima."
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-136 text-sm">
          <thead>
            <tr className="text-muted-foreground border-border border-b text-left text-xs">
              {['Campaña', 'Obras', 'Contratado', 'Margen', 'Frente a la anterior'].map((header) => (
                <th key={header} scope="col" className="px-5 py-3 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y tabular-nums">
            {[...years].reverse().map((row, index, reversed) => {
              const before = reversed[index + 1]
              const points = before ? (row.marginRate - before.marginRate) * 100 : null
              return (
                <tr key={row.year}>
                  <th scope="row" className="px-5 py-3 text-left font-semibold">
                    {row.year}
                  </th>
                  <td className="px-5 py-3">{formatNumber(row.works)}</td>
                  <td className="px-5 py-3">{formatMoney(row.contracted)}</td>
                  <td className="px-5 py-3 font-medium">
                    {formatMoney(row.margin)} · {formatPercent(row.marginRate)}
                  </td>
                  <td className="px-5 py-3">
                    {points === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Tag tone={points < -2 ? 'amber' : 'green'}>
                        {points > 0 ? '+' : ''}
                        {formatNumber(points, 1)} puntos de margen
                      </Tag>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
