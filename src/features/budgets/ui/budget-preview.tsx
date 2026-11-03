import { Users } from 'lucide-react'

import type { BudgetEstimate } from '@/features/workspace'
import { formatMoney, formatNumber, formatPercent } from '@/shared/lib/format'
import { Panel } from '@/shared/ui/surface'

/** Live summary of the sale price and internal costs, including free-form items. */
export function BudgetPreview({ estimate }: { estimate: BudgetEstimate }) {
  const rows = [
    {
      label: 'Mano de obra',
      value: estimate.laborCost,
      hint: `${formatNumber(estimate.workerDays)} peonadas`,
      color: 'bg-brand',
    },
    {
      label: 'Planta y protector',
      value: estimate.materialCost,
      hint: `${formatNumber(estimate.plants)} plantas`,
      color: 'bg-[#86c79a]',
    },
    {
      label: 'Desplazamientos',
      value: estimate.travelCost,
      hint: `${formatNumber(estimate.crewDays)} días`,
      color: 'bg-[#d5d9e0]',
    },
  ]
  if (estimate.otherCost > 0 || estimate.fixedPrice > 0)
    rows.push({
      label: 'Partidas libres',
      value: estimate.otherCost,
      hint: 'Coste interno indicado',
      color: 'bg-slate-400',
    })
  const total = Math.max(estimate.totalCost, 1)
  return (
    <Panel aria-labelledby="preview-title" className="lg:sticky lg:top-0">
      <div className="px-5 pt-5">
        <h2 id="preview-title" className="text-muted-foreground text-xs font-medium">
          Precio de venta
        </h2>
        <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
          {formatMoney(estimate.price, true)}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          + IVA · {estimate.hectares > 0 ? `${formatMoney(estimate.pricePerHectare)}/ha · ` : ''}
          margen{' '}
          <span className="text-foreground font-semibold">
            {formatMoney(estimate.margin, true)}
          </span>{' '}
          ({formatPercent(estimate.marginRate)})
        </p>
      </div>
      {estimate.crewDays > 0 ? (
        <div className="bg-muted/60 mx-5 mt-5 flex items-center gap-3 rounded-lg px-4 py-3">
          <Users aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold tabular-nums">
              {formatNumber(estimate.crewDays)} días
            </span>{' '}
            con una cuadrilla de {formatNumber(estimate.crewSize)}
          </p>
        </div>
      ) : null}
      <div className="mt-5 px-5" aria-hidden="true">
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
          {rows.map((row) => (
            <div
              key={row.label}
              className={row.color}
              style={{ width: `${(row.value / total) * 100}%` }}
            />
          ))}
        </div>
      </div>
      <dl className="divide-border mt-3 divide-y px-5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 py-3 text-sm">
            <span aria-hidden="true" className={`${row.color} size-2 shrink-0 rounded-full`} />
            <dt className="flex-1">
              {row.label}
              <span className="text-muted-foreground block text-xs">{row.hint}</span>
            </dt>
            <dd className="font-medium tabular-nums">{formatMoney(row.value, true)}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between py-3 text-sm font-semibold">
          <dt>Coste total</dt>
          <dd className="tabular-nums">{formatMoney(estimate.totalCost, true)}</dd>
        </div>
      </dl>
    </Panel>
  )
}
