import { cn, Tabs, TabsContent, TabsList, TabsTrigger } from '@doscientos/ui'
import { ChevronDown } from 'lucide-react'

import type { WorkProfitability } from '@/features/workspace'
import { formatMoney, formatPercent } from '@/shared/lib/format'
import { Panel, PanelHeader, ProgressBar, Stat, Tag } from '@/shared/ui/surface'

import {
  WorkCollectionsSummary,
  WorkCostBreakdown,
  WorkEffortSummary,
} from './work-economics-details'

export function WorkEconomicsPanel({ analysis }: { analysis: WorkProfitability }) {
  const { work, performance, hasData } = analysis
  const progress = Math.min(1, Math.max(0, performance.progress))
  const closed = analysis.finished && !work.planned.otherCost && hasData
  const margin = analysis.projectedMargin
  const plannedMargin = work.planned.price - work.planned.totalCost
  const marginColor =
    margin === null
      ? 'border-border bg-muted/20'
      : margin < 0
        ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200'
        : margin < plannedMargin
          ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
          : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'

  return (
    <Panel aria-labelledby="economics-title" className="@container">
      <PanelHeader
        id="economics-title"
        title="Rentabilidad de la obra"
        description="Previsión de cierre según los partes registrados. Importes sin IVA."
        meta={
          <Tag tone={!hasData ? 'gray' : closed ? 'green' : 'blue'}>
            {!hasData ? 'Sin partes' : closed ? 'Cierre operativo' : 'Estimación'}
          </Tag>
        }
      />
      <div className="space-y-4 p-5">
        <div className="text-muted-foreground flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs">
          <p>
            Contratado{' '}
            <strong className="text-foreground">{formatMoney(work.planned.price)}</strong>
          </p>
          <p>
            {hasData
              ? `${formatPercent(progress)} ejecutado · ${performance.reportCount} ${performance.reportCount === 1 ? 'parte' : 'partes'}`
              : 'Sin actividad registrada'}
          </p>
        </div>
        <ProgressBar
          value={progress}
          label="Avance ejecutado de la obra"
          tone={hasData ? 'brand' : 'muted'}
        />
        <div className="grid grid-cols-2 gap-3 @lg:grid-cols-3">
          <div className={cn('col-span-2 rounded-xl border p-4 @lg:col-span-1', marginColor)}>
            <p className="text-xs font-medium">Margen operativo</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
              {margin === null ? '—' : formatMoney(margin)}
            </p>
            <p className="mt-1 text-xs">
              {analysis.projectedMarginRate === null
                ? 'Sin base para estimar'
                : `${formatPercent(analysis.projectedMarginRate, 1)} sobre venta`}
            </p>
            {margin !== null ? (
              <p className="mt-2 text-xs font-medium">
                {margin < 0
                  ? 'Previsión de pérdidas'
                  : margin < plannedMargin
                    ? 'Por debajo del margen previsto'
                    : 'Dentro del margen previsto'}
              </p>
            ) : null}
          </div>
          <div className="border-border rounded-xl border p-4">
            <Stat
              label="Coste al terminar"
              value={analysis.projectedCost === null ? '—' : formatMoney(analysis.projectedCost)}
              hint={`Previsto: ${formatMoney(work.planned.totalCost)}`}
            />
          </div>
          <div className="border-border rounded-xl border p-4">
            <Stat
              label="Desviación al avance"
              value={
                analysis.costDeviation === null ? '—' : formatMoney(analysis.costDeviation, true)
              }
              hint={
                analysis.costDeviation === null
                  ? 'Sin partes para comparar'
                  : analysis.costDeviation > 0
                    ? 'Por encima del coste previsto'
                    : analysis.costDeviation < 0
                      ? 'Por debajo del coste previsto'
                      : 'En línea con el presupuesto'
              }
            />
          </div>
        </div>
        {!analysis.canProject ? (
          <p className="text-muted-foreground text-xs">
            {hasData
              ? 'Los partes aún no registran avance suficiente para estimar el cierre.'
              : 'Añade el primer parte para conocer el coste y estimar el margen.'}
          </p>
        ) : null}
      </div>
      <Tabs defaultSelectedKey="costs" className="border-border gap-4 border-t p-5">
        <TabsList aria-label="Detalle económico de la obra" className="w-full">
          <TabsTrigger id="costs" className="flex-1">
            Costes
          </TabsTrigger>
          <TabsTrigger id="effort" className="flex-1">
            Esfuerzo
          </TabsTrigger>
          <TabsTrigger id="collections" className="flex-1">
            Cobros
          </TabsTrigger>
        </TabsList>
        <TabsContent id="costs">
          <WorkCostBreakdown analysis={analysis} />
        </TabsContent>
        <TabsContent id="effort">
          <WorkEffortSummary analysis={analysis} />
        </TabsContent>
        <TabsContent id="collections">
          <WorkCollectionsSummary analysis={analysis} />
        </TabsContent>
      </Tabs>
      <details className="border-border border-t px-5 py-4">
        <summary className="text-muted-foreground focus-visible:ring-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded text-xs font-medium focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
          Cómo se calculan estas cifras
          <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
        </summary>
        <div className="text-muted-foreground mt-3 space-y-2 text-xs leading-relaxed">
          <p>El margen es operativo: no incluye gastos generales ni ajustes fiscales.</p>
          <p>
            Personal valorado a la tarifa diaria actual; planta y transporte a precios del
            presupuesto. No son costes históricos de nómina ni facturas conciliadas.
          </p>
          <p>
            Los justificantes incluyen IVA y se muestran aparte, sin sumarse automáticamente: pueden
            corresponder a material o transporte ya valorado.
          </p>
          {work.planned.otherCost ? (
            <p>
              Las partidas libres conservan {formatMoney(work.planned.otherCost, true)} de coste
              presupuestado en la previsión de cierre. Los partes no miden su ejecución: no se
              incluyen en el coste acumulado ni en la desviación al mismo avance.
            </p>
          ) : null}
        </div>
      </details>
    </Panel>
  )
}
