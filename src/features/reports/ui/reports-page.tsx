import { MetricCard, MetricGrid } from '@doscientos/ui'
import { ChartColumn, Layers } from 'lucide-react'
import { useState } from 'react'

import {
  availableYears,
  groupBy,
  monthlyPlants,
  relativeChange,
  summarizeYear,
  useWorkspace,
} from '@/features/workspace'
import { formatMoney, formatNumber, formatPercent, formatSignedPercent } from '@/shared/lib/format'
import { FilterTabs } from '@/shared/ui/filter-tabs'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader } from '@/shared/ui/surface'

import { GroupMarginChart, MonthlyPlantsChart } from './report-charts'

type Dimension = 'zona' | 'cliente'

export function ReportsPage() {
  const workspace = useWorkspace()
  const years = availableYears(workspace)
  const [dimension, setDimension] = useState<Dimension>('zona')
  const current = summarizeYear(workspace, years.at(-1) ?? 0)
  const previous = summarizeYear(workspace, years.at(-2) ?? 0)
  const groups = groupBy(workspace, years, dimension)
  const monthly = monthlyPlants(workspace, years)

  const delta = (now: number, before: number) => {
    const change = relativeChange(now, before)
    return {
      trend: change < 0 ? ('down' as const) : ('up' as const),
      delta: `${formatSignedPercent(change)} vs ${previous.year}`,
    }
  }

  return (
    <>
      <PageTop
        title="Informes"
        description={`Campaña ${current.year} frente a ${previous.year}. El margen de las obras abiertas se estima al ritmo real.`}
      />
      <MetricGrid className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Facturación presupuestada"
          value={formatMoney(current.revenue)}
          description={`${current.works} obras`}
          {...delta(current.revenue, previous.revenue)}
        />
        <MetricCard
          label="Margen"
          value={formatMoney(current.margin)}
          description={`${formatPercent(current.marginRate)} sobre venta · ${previous.year}: ${formatPercent(previous.marginRate)}`}
          {...delta(current.margin, previous.margin)}
          tone={current.marginRate >= previous.marginRate ? 'success' : 'warning'}
        />
        <MetricCard
          label="Hectáreas"
          value={formatNumber(current.hectares, 1)}
          description={`${formatNumber(current.plants)} plantas`}
          {...delta(current.hectares, previous.hectares)}
        />
        <MetricCard
          label="Rendimiento real"
          value={`${formatNumber(current.actualYield)} pl/peón`}
          description={`Presupuestado ${formatNumber(current.plannedYield)} · ${previous.year}: ${formatNumber(previous.actualYield)}`}
          {...delta(current.actualYield, previous.actualYield)}
        />
      </MetricGrid>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel aria-labelledby="monthly-title">
          <PanelHeader
            id="monthly-title"
            icon={<ChartColumn className="size-5" strokeWidth={1.75} />}
            title="Plantas puestas por mes"
            description="Según los partes diarios."
          />
          <div className="p-4">
            <MonthlyPlantsChart points={monthly} years={years} />
          </div>
        </Panel>
        <Panel aria-labelledby="group-title">
          <PanelHeader
            id="group-title"
            icon={<Layers className="size-5" strokeWidth={1.75} />}
            title={dimension === 'zona' ? 'Margen por zona' : 'Margen por cliente'}
            action={
              <FilterTabs
                label="Agrupar por"
                value={dimension}
                onChange={setDimension}
                options={[
                  {
                    value: 'zona',
                    label: 'Zona',
                    count: new Set(workspace.works.map((work) => work.zoneId)).size,
                  },
                  {
                    value: 'cliente',
                    label: 'Cliente',
                    count: new Set(workspace.works.map((work) => work.clientId)).size,
                  },
                ]}
              />
            }
          />
          <div className="p-4">
            <GroupMarginChart rows={groups} years={years} />
          </div>
        </Panel>
      </div>
      <Panel aria-labelledby="table-title" className="mt-5">
        <PanelHeader id="table-title" title="Comparativa por campaña" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-left text-xs">
                {[
                  'Campaña',
                  'Obras',
                  'Hectáreas',
                  'Facturación',
                  'Coste',
                  'Margen',
                  'Rendimiento',
                ].map((header) => (
                  <th key={header} scope="col" className="px-5 py-3 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-border divide-y tabular-nums">
              {years.map((year) => {
                const summary = summarizeYear(workspace, year)
                return (
                  <tr key={year} className="panel-row">
                    <th scope="row" className="px-5 py-3 text-left font-semibold">
                      {year}
                    </th>
                    <td className="px-5 py-3">{summary.works}</td>
                    <td className="px-5 py-3">{formatNumber(summary.hectares, 1)}</td>
                    <td className="px-5 py-3">{formatMoney(summary.revenue)}</td>
                    <td className="px-5 py-3">{formatMoney(summary.cost)}</td>
                    <td className="px-5 py-3 font-medium">
                      {formatMoney(summary.margin)} · {formatPercent(summary.marginRate)}
                    </td>
                    <td className="px-5 py-3">{formatNumber(summary.actualYield)} pl/peón</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}
