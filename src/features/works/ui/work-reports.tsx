import { ClipboardList, CloudRain } from 'lucide-react'

import {
  incidentLabels,
  lookup,
  reportsForWork,
  type Work,
  type Workspace,
} from '@/features/workspace'
import { formatNumber, formatShortDate, formatWeekday } from '@/shared/lib/format'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

export function WorkReports({ work, workspace }: { work: Work; workspace: Workspace }) {
  const find = lookup(workspace)
  const reports = [...reportsForWork(work.id, workspace.reports)].sort((a, b) =>
    b.date.localeCompare(a.date),
  )
  const perWorker = work.planned.workerDays > 0 ? work.planned.plants / work.planned.workerDays : 0
  return (
    <Panel aria-labelledby="reports-title">
      <PanelHeader
        id="reports-title"
        icon={<ClipboardList className="size-5" strokeWidth={1.75} />}
        title="Partes diarios"
        description="Lo que el capataz registra cada tarde desde el móvil."
        meta={formatNumber(reports.length)}
      />
      {reports.length === 0 ? (
        <EmptyPanel
          icon={<ClipboardList className="size-5" />}
          title="Todavía no hay partes"
          description="Cuando la cuadrilla empiece, el capataz rellenará el parte de cada jornada."
        />
      ) : (
        <ul className="divide-border max-h-[28rem] divide-y overflow-y-auto">
          {reports.map((report) => {
            const target = perWorker * report.workerIds.length
            const ratio = target > 0 ? report.plants / target : 0
            return (
              <li
                key={report.id}
                className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 px-5 py-3"
              >
                <span className="text-center">
                  <span className="text-muted-foreground block text-[0.6875rem] uppercase">
                    {formatWeekday(report.date)}
                  </span>
                  <span className="block text-sm font-semibold">
                    {formatShortDate(report.date)}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm">
                    {find.crew(report.crewId)?.name} · {report.workerIds.length} personas
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {report.incident !== 'ninguna' ? (
                      <span className="inline-flex items-center gap-1">
                        <CloudRain aria-hidden="true" className="size-3" />
                        {incidentLabels[report.incident]}
                        {report.notes ? ` · ${report.notes}` : ''}
                      </span>
                    ) : (
                      report.notes || incidentLabels.ninguna
                    )}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold tabular-nums">
                    {formatNumber(report.plants)} pl
                  </span>
                  {target > 0 ? (
                    <Tag tone={ratio < 0.9 ? 'amber' : 'green'} className="mt-0.5">
                      {formatNumber(ratio * 100)} % del ritmo
                    </Tag>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
