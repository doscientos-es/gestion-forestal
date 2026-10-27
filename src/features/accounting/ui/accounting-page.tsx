import { MetricCard, MetricGrid } from '@doscientos/ui'
import { ChartColumn, Landmark } from 'lucide-react'
import { useState } from 'react'

import {
  accountingYears,
  monthlyAccounts,
  periodTotals,
  quarterlyComparison,
  quarters,
  relativeChange,
  useWorkspace,
  type AccountingMetric,
} from '@/features/workspace'
import { formatMoney, formatSignedPercent } from '@/shared/lib/format'
import { FilterTabs } from '@/shared/ui/filter-tabs'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader } from '@/shared/ui/surface'

import { MonthlyAccountsChart, QuarterlyChart } from './accounting-charts'

const metricLabels: Record<AccountingMetric, string> = {
  income: 'Ingresos',
  expenses: 'Gastos',
  result: 'Resultado',
}

export function AccountingPage() {
  const workspace = useWorkspace()
  const years = accountingYears(workspace)
  const [metric, setMetric] = useState<AccountingMetric>('income')
  const [picked, setPicked] = useState<number | null>(null)
  const year = picked ?? years.at(-1) ?? new Date().getFullYear()
  const previousYear = year - 1
  // The selected year against the two before it (only those that have data).
  const compared = [year - 2, year - 1, year].filter(
    (item) => years.includes(item) || item === year,
  )

  const current = periodTotals(workspace, year)
  const previous = periodTotals(workspace, previousYear)
  const delta = (now: number, before: number) => {
    const change = relativeChange(now, before)
    return {
      trend: change < 0 ? ('down' as const) : ('up' as const),
      delta: `${formatSignedPercent(change)} vs ${previousYear}`,
    }
  }

  return (
    <>
      <PageTop
        title="Contabilidad"
        description="Lo facturado y lo gastado, por trimestre y año. Ingresos: facturas emitidas sin IVA. Gastos: aprobados, con IVA."
      />
      <div className="mb-5">
        <FilterTabs
          label="Año"
          value={String(year)}
          onChange={(value) => setPicked(Number(value))}
          options={[...years].reverse().map((item) => ({
            value: String(item),
            label: String(item),
            count: workspace.invoices.filter(
              (invoice) => invoice.status !== 'borrador' && invoice.date.startsWith(String(item)),
            ).length,
          }))}
        />
      </div>
      <MetricGrid className="mb-5 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Ingresos"
          value={formatMoney(current.income)}
          description={`${previousYear}: ${formatMoney(previous.income)}`}
          {...delta(current.income, previous.income)}
        />
        <MetricCard
          label="Gastos"
          value={formatMoney(current.expenses)}
          description={`${previousYear}: ${formatMoney(previous.expenses)}`}
          {...delta(current.expenses, previous.expenses)}
          tone={current.expenses <= previous.expenses ? 'success' : 'warning'}
        />
        <MetricCard
          label="Resultado"
          value={formatMoney(current.result)}
          description={`${previousYear}: ${formatMoney(previous.result)}`}
          {...delta(current.result, previous.result)}
          tone={current.result >= previous.result ? 'success' : 'warning'}
        />
      </MetricGrid>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel aria-labelledby="quarters-title">
          <PanelHeader
            id="quarters-title"
            icon={<ChartColumn className="size-5" strokeWidth={1.75} />}
            title="Comparativa por trimestre"
            action={
              <FilterTabs
                label="Concepto"
                value={metric}
                onChange={setMetric}
                options={(Object.keys(metricLabels) as AccountingMetric[]).map((value) => ({
                  value,
                  label: metricLabels[value],
                  count: compared.length,
                }))}
              />
            }
          />
          <div className="p-4">
            <QuarterlyChart
              points={quarterlyComparison(workspace, compared, metric)}
              years={compared}
              metricLabel={metricLabels[metric]}
            />
          </div>
        </Panel>
        <Panel aria-labelledby="months-title">
          <PanelHeader
            id="months-title"
            icon={<Landmark className="size-5" strokeWidth={1.75} />}
            title={`Ingresos y gastos de ${year}`}
            description="Mes a mes."
          />
          <div className="p-4">
            <MonthlyAccountsChart points={monthlyAccounts(workspace, year)} year={year} />
          </div>
        </Panel>
      </div>
      <Panel aria-labelledby="table-title" className="mt-5">
        <PanelHeader id="table-title" title={`Trimestres de ${year}`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-left text-xs">
                {[
                  'Trimestre',
                  'Ingresos',
                  'Gastos',
                  'Resultado',
                  `Resultado ${previousYear}`,
                  'Variación',
                ].map((header) => (
                  <th key={header} scope="col" className="px-5 py-3 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quarters.map((quarter) => {
                const now = periodTotals(workspace, year, quarter)
                const before = periodTotals(workspace, previousYear, quarter)
                return (
                  <tr key={quarter} className="border-border border-b last:border-b-0">
                    <th scope="row" className="px-5 py-3 text-left font-semibold">
                      T{quarter}
                    </th>
                    <td className="px-5 py-3 tabular-nums">{formatMoney(now.income)}</td>
                    <td className="px-5 py-3 tabular-nums">{formatMoney(now.expenses)}</td>
                    <td className="px-5 py-3 font-medium tabular-nums">
                      {formatMoney(now.result)}
                    </td>
                    <td className="text-muted-foreground px-5 py-3 tabular-nums">
                      {formatMoney(before.result)}
                    </td>
                    <td className="px-5 py-3 tabular-nums">
                      {before.result === 0
                        ? '—'
                        : formatSignedPercent(relativeChange(now.result, before.result))}
                    </td>
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
