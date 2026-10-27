import { Button } from '@doscientos/ui'
import { Download, Palmtree } from 'lucide-react'

import { useWorkspace, vacationRows } from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { csvText, toCsv } from '@/shared/lib/csv'
import { downloadTextFile } from '@/shared/lib/download'
import { formatNumber } from '@/shared/lib/format'
import { Panel, PanelHeader, ProgressBar, Tag } from '@/shared/ui/surface'

/** Days left per person, least left first, so nobody reaches December with a pile of days unused. */
export function VacationBalances() {
  const workspace = useWorkspace()
  const today = clock.today()
  const year = Number(today.slice(0, 4))
  const rows = vacationRows(workspace, year)
  const crewName = (crewId: string | null) =>
    workspace.crews.find((crew) => crew.id === crewId)?.name ?? ''

  return (
    <Panel aria-labelledby="balances-title">
      <PanelHeader
        id="balances-title"
        icon={<Palmtree className="size-5" strokeWidth={1.75} />}
        title={`Saldo de vacaciones ${year}`}
        description="Días laborables aprobados o disfrutados, pendientes y restantes."
        action={
          <Button
            variant="outline"
            size="sm"
            onPress={() =>
              downloadTextFile(
                `vacaciones-${year}.csv`,
                toCsv(
                  ['Persona', 'Cuadrilla', 'Aprobados', 'Pendientes', 'Restantes', 'Total'],
                  rows.map((row) => [
                    csvText(row.person.name),
                    csvText(crewName(row.person.crewId)),
                    row.approved,
                    row.pending,
                    row.remaining,
                    row.total,
                  ]),
                ),
              )
            }
          >
            <Download aria-hidden="true" className="size-4" /> Descargar CSV
          </Button>
        }
      />
      <ul className="divide-border divide-y">
        {rows.map((row) => (
          <li key={row.person.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
            <span className="min-w-40 flex-1">
              <span className="block truncate text-sm font-medium">{row.person.name}</span>
              <span className="text-muted-foreground block truncate text-xs">
                {crewName(row.person.crewId)}
              </span>
            </span>
            <span className="flex w-48 items-center gap-2">
              <ProgressBar
                value={(row.approved + row.pending) / row.total}
                label={`Días usados por ${row.person.name}`}
                tone={row.remaining <= 3 ? 'warning' : 'brand'}
              />
              <span className="text-muted-foreground w-14 text-right text-xs tabular-nums">
                {formatNumber(row.approved + row.pending)}/{row.total}
              </span>
            </span>
            <span className="flex w-40 items-center justify-end gap-2">
              {row.pending > 0 ? <Tag tone="amber">{row.pending} pendientes</Tag> : null}
              <span className="text-sm font-semibold tabular-nums">
                {formatNumber(row.remaining)} días
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
