import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonthPoint, QuarterPoint } from "@/features/workspace";
import { formatMonth, formatMoney } from "@/shared/lib/format";
import { ChartDataTable, ChartTooltip, axisProps, chartColors } from "@/shared/ui/charts";

function yearColor(index: number, total: number) {
  return index === total - 1
    ? chartColors.brand
    : index === total - 2
      ? chartColors.brandSoft
      : chartColors.muted;
}

const money = (cents: number) => formatMoney(cents);
const quarterLabel = (quarter: string | number) => `T${quarter}`;

export function QuarterlyChart({
  points,
  years,
  metricLabel,
}: {
  points: QuarterPoint[];
  years: number[];
  metricLabel: string;
}) {
  return (
    <figure className="m-0">
      <div className="h-72 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} barGap={2} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis dataKey="quarter" {...axisProps} tickFormatter={quarterLabel} />
            <YAxis {...axisProps} width={72} tickFormatter={money} />
            <Tooltip
              cursor={{ fill: "#f1f3f5" }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  formatLabel={(quarter) => `${quarterLabel(quarter)} · ${metricLabel}`}
                  formatValue={money}
                />
              )}
            />
            <Legend iconType="circle" iconSize={8} />
            {years.map((year, index) => (
              <Bar
                key={year}
                dataKey={String(year)}
                name={String(year)}
                fill={yearColor(index, years.length)}
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption={`${metricLabel} por trimestre y año`}
        headers={["Trimestre", ...years.map(String)]}
        rows={points.map((point) => [
          quarterLabel(point.quarter),
          ...years.map((year) => formatMoney(point[String(year)] ?? 0)),
        ])}
      />
    </figure>
  );
}

export function MonthlyAccountsChart({ points, year }: { points: MonthPoint[]; year: number }) {
  return (
    <figure className="m-0">
      <div className="h-72 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} barGap={2} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis dataKey="month" {...axisProps} tickFormatter={formatMonth} />
            <YAxis {...axisProps} width={72} tickFormatter={money} />
            <Tooltip
              cursor={{ fill: "#f1f3f5" }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  formatLabel={(month) => `${formatMonth(Number(month))} ${year}`}
                  formatValue={money}
                />
              )}
            />
            <Legend iconType="circle" iconSize={8} />
            <Bar
              dataKey="income"
              name="Ingresos"
              fill={chartColors.brand}
              radius={[6, 6, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="expenses"
              name="Gastos"
              fill={chartColors.amber}
              radius={[6, 6, 0, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption={`Ingresos y gastos por mes en ${year}`}
        headers={["Mes", "Ingresos", "Gastos", "Resultado"]}
        rows={points.map((point) => [
          formatMonth(point.month),
          formatMoney(point.income),
          formatMoney(point.expenses),
          formatMoney(point.result),
        ])}
      />
    </figure>
  );
}
