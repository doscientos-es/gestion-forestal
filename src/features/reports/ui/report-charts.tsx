import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { GroupRow, MonthlyPoint } from '@/features/workspace'
import { formatMonth, formatMoney, formatNumber } from '@/shared/lib/format'
import { ChartDataTable, ChartTooltip, axisProps, chartColors } from '@/shared/ui/charts'

function yearColor(index: number, total: number) {
  return index === total - 1
    ? chartColors.brand
    : index === total - 2
      ? chartColors.brandSoft
      : chartColors.muted
}

function LegendLabel(value: string) {
  return <span className="text-muted-foreground text-xs">Campaña {value}</span>
}

export function MonthlyPlantsChart({ points, years }: { points: MonthlyPoint[]; years: number[] }) {
  return (
    <figure className="m-0">
      <div className="h-72 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} barGap={2} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis
              dataKey="month"
              {...axisProps}
              tickFormatter={(month: number) => formatMonth(month)}
            />
            <YAxis
              {...axisProps}
              width={56}
              tickFormatter={(value: number) => formatNumber(value)}
            />
            <Tooltip
              cursor={{ fill: '#f1f3f5' }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  formatLabel={(month) => formatMonth(Number(month))}
                  formatValue={(value) => `${formatNumber(value)} plantas`}
                />
              )}
            />
            <Legend iconType="circle" iconSize={8} formatter={LegendLabel} />
            {years.map((year, index) => (
              <Bar
                key={year}
                dataKey={String(year)}
                name={String(year)}
                fill={yearColor(index, years.length)}
                radius={[6, 6, 0, 0]}
                maxBarSize={22}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption="Plantas puestas por mes y campaña"
        headers={['Mes', ...years.map(String)]}
        rows={points.map((point) => [
          formatMonth(point.month),
          ...years.map((year) => point[String(year)] ?? 0),
        ])}
      />
    </figure>
  )
}

export function GroupMarginChart({ rows, years }: { rows: GroupRow[]; years: number[] }) {
  const data = rows.map((row) => ({
    label: row.label,
    ...Object.fromEntries(
      years.map((year) => [String(year), (row.values[year]?.margin ?? 0) / 100]),
    ),
  }))
  return (
    <figure className="m-0">
      <div className="h-72 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            barGap={2}
            margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
          >
            <CartesianGrid horizontal={false} stroke={chartColors.grid} />
            <XAxis
              type="number"
              {...axisProps}
              tickFormatter={(value: number) => formatMoney(value * 100)}
            />
            <YAxis type="category" dataKey="label" {...axisProps} width={110} />
            <Tooltip
              cursor={{ fill: '#f1f3f5' }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  formatValue={(value) => formatMoney(value * 100)}
                />
              )}
            />
            <Legend iconType="circle" iconSize={8} formatter={LegendLabel} />
            {years.map((year, index) => (
              <Bar
                key={year}
                dataKey={String(year)}
                name={String(year)}
                fill={yearColor(index, years.length)}
                radius={[0, 6, 6, 0]}
                maxBarSize={16}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption="Margen por grupo y campaña"
        headers={['Grupo', ...years.map(String)]}
        rows={rows.map((row) => [
          row.label,
          ...years.map((year) => formatMoney(row.values[year]?.margin ?? 0)),
        ])}
      />
    </figure>
  )
}
