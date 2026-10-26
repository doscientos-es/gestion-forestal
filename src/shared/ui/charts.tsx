import type { ReactNode } from 'react'

/** Shared Recharts styling: thin axes, muted ticks, white rounded tooltip. */
export const chartColors = {
  brand: '#1d7a3c',
  brandSoft: '#86c79a',
  muted: '#cbd0d8',
  amber: '#d97706',
  grid: '#eceef2',
  tick: '#6b7280',
}

export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: chartColors.tick, fontSize: 12 },
} as const

type TooltipEntry = { name?: string | number; value?: unknown; color?: string }

export function ChartTooltip({
  active,
  payload,
  label,
  formatLabel,
  formatValue,
}: {
  active?: boolean | undefined
  payload?: readonly TooltipEntry[] | undefined
  label?: string | number | undefined
  formatLabel?: ((label: string | number) => ReactNode) | undefined
  formatValue: (value: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="border-border bg-card rounded-lg border px-3 py-2 text-xs shadow-lg">
      {label !== undefined ? (
        <p className="mb-1 font-semibold">{formatLabel ? formatLabel(label) : label}</p>
      ) : null}
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li key={String(entry.name)} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums">
              {formatValue(Number(entry.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Visually hidden data table so chart content is available to assistive tech. */
export function ChartDataTable({
  caption,
  headers,
  rows,
}: {
  caption: string
  headers: string[]
  rows: (string | number)[][]
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header} scope="col">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
