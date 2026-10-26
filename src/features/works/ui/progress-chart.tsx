import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { ProgressPoint } from '@/features/workspace'
import { formatNumber, formatShortDate } from '@/shared/lib/format'
import { ChartDataTable, ChartTooltip, axisProps, chartColors } from '@/shared/ui/charts'

export function ProgressChart({ points, title }: { points: ProgressPoint[]; title: string }) {
  return (
    <figure className="m-0">
      <div className="h-56 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="progress-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.brand} stopOpacity={0.22} />
                <stop offset="100%" stopColor={chartColors.brand} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis dataKey="date" {...axisProps} tickFormatter={formatShortDate} minTickGap={24} />
            <YAxis
              {...axisProps}
              width={56}
              tickFormatter={(value: number) => formatNumber(value)}
            />
            <Tooltip
              cursor={{ stroke: chartColors.muted }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  formatLabel={(value) => formatShortDate(String(value))}
                  formatValue={(value) => `${formatNumber(value)} plantas`}
                />
              )}
            />
            <Line
              type="monotone"
              dataKey="planned"
              name="Según presupuesto"
              stroke={chartColors.muted}
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="actual"
              name="Real"
              stroke={chartColors.brand}
              strokeWidth={2.5}
              fill="url(#progress-fill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-muted-foreground mt-2 flex flex-wrap gap-4 px-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="bg-brand h-0.5 w-4 rounded" /> Plantas reales
          acumuladas
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-0.5 w-4 rounded border-t-2 border-dashed border-[#cbd0d8]"
          />{' '}
          Ritmo del presupuesto
        </span>
      </figcaption>
      <ChartDataTable
        caption={title}
        headers={['Fecha', 'Real acumulado', 'Según presupuesto']}
        rows={points.map((point) => [point.date, point.actual, point.planned])}
      />
    </figure>
  )
}
