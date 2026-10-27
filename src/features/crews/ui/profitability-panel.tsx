import { Button, MetricCard, MetricGrid } from '@doscientos/ui'
import { Download, TrendingUp } from 'lucide-react'

import { YieldDeviation } from '@/features/works'
import { availableYears, crewProfitability, useWorkspace } from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { csvDecimal, csvText, toCsv } from '@/shared/lib/csv'
import { downloadTextFile } from '@/shared/lib/download'
import { formatMoney, formatNumber, formatPercent } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/use-url-state'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { ChoiceField } from '@/shared/ui/form-controls'
import { Panel, PanelHeader, ProgressBar } from '@/shared/ui/surface'

/** Which crew earns more per euro of cost, with the yield that explains it. */
export function ProfitabilityPanel() {
  const workspace = useWorkspace()
  const years = availableYears(workspace)
  const [campaign, setCampaign] = useUrlState('campana', String(years.at(-1) ?? 'todos'), [
    'todos',
    ...years.map(String),
  ])
  const rows = crewProfitability(workspace, campaign === 'todos' ? null : Number(campaign))
  const active = rows.filter((row) => row.revenue > 0)
  const best = active[0]
  const worst = active.length > 1 ? active.at(-1) : undefined
  const maxRate = Math.max(0.01, ...active.map((row) => Math.abs(row.marginRate)))

  return (
    <>
      {best ? (
        <MetricGrid className="mb-5 grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Más rentable"
            value={best.crew.name}
            description={`${formatPercent(best.marginRate)} de margen · ${formatMoney(best.margin)}`}
            tone="success"
          />
          {worst ? (
            <MetricCard
              label="Menos rentable"
              value={worst.crew.name}
              description={`${formatPercent(worst.marginRate)} de margen · ${formatMoney(worst.margin)}`}
              tone={worst.marginRate < 0.1 ? 'warning' : 'default'}
            />
          ) : null}
          <MetricCard
            label="Margen del conjunto"
            value={formatMoney(active.reduce((sum, row) => sum + row.margin, 0))}
            description={`${formatMoney(active.reduce((sum, row) => sum + row.revenue, 0))} de ingreso imputado`}
          />
        </MetricGrid>
      ) : null}
      <Panel aria-labelledby="profit-title">
        <PanelHeader
          id="profit-title"
          icon={<TrendingUp className="size-5" strokeWidth={1.75} />}
          title="Rentabilidad por cuadrilla"
          description="El precio de cada obra se reparte según lo que plantó cada cuadrilla; el coste es el real de los partes."
          action={
            <div className="flex items-center gap-2">
              <ChoiceField
                hideLabel
                className="w-40"
                label="Campaña"
                value={campaign}
                onChange={setCampaign}
                options={[
                  { value: 'todos', label: 'Todas las campañas' },
                  ...years.map((year) => ({ value: String(year), label: `Campaña ${year}` })),
                ]}
              />
              <Button
                variant="outline"
                size="sm"
                isDisabled={active.length === 0}
                onPress={() =>
                  downloadTextFile(
                    `rentabilidad-cuadrillas-${clock.today()}.csv`,
                    toCsv(
                      [
                        'Cuadrilla',
                        'Obras',
                        'Peonadas',
                        'Plantas',
                        'Rendimiento',
                        'Ingreso',
                        'Coste',
                        'Margen',
                        'Margen %',
                      ],
                      rows.map((row) => [
                        csvText(row.crew.name),
                        row.works,
                        row.workerDays,
                        row.plants,
                        csvDecimal(row.yield, 1),
                        csvDecimal(row.revenue / 100),
                        csvDecimal(row.cost / 100),
                        csvDecimal(row.margin / 100),
                        csvDecimal(row.marginRate * 100, 1),
                      ]),
                    ),
                  )
                }
              >
                <Download aria-hidden="true" className="size-4" /> CSV
              </Button>
            </div>
          }
        />
        {active.length === 0 ? (
          <EmptyPanel
            icon={<TrendingUp className="size-5" />}
            title="Todavía no hay partes en esta campaña"
            description="La rentabilidad aparece cuando las cuadrillas envían su primer parte diario."
          />
        ) : (
          <ul className="divide-border divide-y">
            {rows.map((row, index) => (
              <li key={row.crew.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-sm font-semibold">
                    <span className="text-muted-foreground mr-2 tabular-nums">{index + 1}.</span>
                    {row.crew.name}
                  </p>
                  <p className="text-sm tabular-nums">
                    <span className="font-semibold">{formatMoney(row.margin)}</span>{' '}
                    <span className="text-muted-foreground">
                      · {row.revenue > 0 ? formatPercent(row.marginRate) : 'sin datos'}
                    </span>
                  </p>
                </div>
                <ProgressBar
                  className="my-2"
                  value={row.revenue > 0 ? Math.abs(row.marginRate) / maxRate : 0}
                  label={`Margen de ${row.crew.name}`}
                  tone={row.marginRate < 0.1 ? 'warning' : 'brand'}
                />
                <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
                  <span>{formatNumber(row.works)} obras</span>
                  <span>{formatNumber(row.workerDays)} peonadas</span>
                  <span>{formatNumber(row.plants)} plantas</span>
                  <span>
                    {formatNumber(row.yield)} pl/peón
                    {row.plannedYield > 0 ? ` (previsto ${formatNumber(row.plannedYield)})` : ''}
                  </span>
                  <YieldDeviation value={row.yieldDeviation} hasData={row.workerDays > 0} />
                  <span>
                    Ingreso {formatMoney(row.revenue)} · coste {formatMoney(row.cost)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
