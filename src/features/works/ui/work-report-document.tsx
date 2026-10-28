import { TreePine } from 'lucide-react'

import {
  clientWorkReport,
  incidentLabels,
  lookup,
  type Work,
  type Workspace,
} from '@/features/workspace'
import { company } from '@/shared/lib/company'
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatShortDate,
  formatWeekday,
} from '@/shared/lib/format'
import { ProgressBar } from '@/shared/ui/surface'

/**
 * Progress report for the client: how far the work is, a day-by-day diary and photos.
 * No costs, margin or yields. Used in the preview and for printing to PDF.
 */
export function WorkReportDocument({ work, workspace }: { work: Work; workspace: Workspace }) {
  const find = lookup(workspace)
  const report = clientWorkReport(work, workspace)
  const client = find.client(work.clientId)
  const incidents = Object.entries(report.incidents)
  const finished = work.status === 'terminada' || work.status === 'facturada'

  return (
    <article
      aria-label={`Informe de obra ${work.code}`}
      className="print-invoice border-border mx-auto w-full max-w-3xl rounded-lg border bg-white p-6 text-sm text-zinc-900 sm:p-10"
    >
      <header className="flex items-start justify-between gap-6 border-b border-zinc-200 pb-6">
        <div className="flex items-center gap-3">
          <span className="bg-brand flex size-10 items-center justify-center rounded-md text-white">
            <TreePine aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight">{company.name}</p>
            <p className="text-xs text-zinc-500">{company.tagline}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs tracking-wide text-zinc-500 uppercase">Informe de obra</p>
          <p className="text-lg font-semibold tabular-nums">{work.code}</p>
          <p className="text-xs text-zinc-500">
            {report.to ? `Hasta el ${formatDate(report.to)}` : 'Sin trabajos todavía'}
          </p>
        </div>
      </header>

      <section className="grid gap-6 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs text-zinc-500">Cliente</p>
          <p className="font-semibold">{client?.name}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Obra</p>
          <p className="font-semibold">{work.title}</p>
          <p className="text-zinc-600">
            {find.zone(work.zoneId)?.name} ·{' '}
            {work.speciesIds.map((id) => find.species(id)?.name).join(', ')}
          </p>
        </div>
      </section>

      <section aria-label="Avance" className="rounded-lg bg-zinc-50 p-5">
        <div className="flex items-end justify-between gap-4">
          <p className="text-4xl font-semibold tracking-tight tabular-nums">
            {formatPercent(report.progress)}
          </p>
          <p className="text-zinc-600">{finished ? 'Obra terminada' : 'Avance de la obra'}</p>
        </div>
        <ProgressBar value={report.progress} label="Avance de la obra" className="mt-3" />
        <dl className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <dt className="text-xs text-zinc-500">Plantas</dt>
            <dd className="font-semibold tabular-nums">
              {formatNumber(report.plants)} / {formatNumber(report.plannedPlants)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Superficie</dt>
            <dd className="font-semibold tabular-nums">
              {formatNumber(report.hectares, 1)} / {formatNumber(report.plannedHectares, 1)} ha
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Jornadas</dt>
            <dd className="font-semibold tabular-nums">{formatNumber(report.crewDays)}</dd>
          </div>
        </dl>
        {incidents.length > 0 ? (
          <p className="mt-3 text-xs text-zinc-600">
            Jornadas con incidencias:{' '}
            {incidents
              .map(
                ([kind, days]) =>
                  `${incidentLabels[kind as keyof typeof incidentLabels]} (${days})`,
              )
              .join(', ')}
            .
          </p>
        ) : null}
      </section>

      {report.photos.length > 0 ? (
        <section aria-label="Fotos" className="mt-6">
          <h2 className="mb-3 font-semibold">Fotos de la obra</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {report.photos.slice(0, 6).map(({ photo, date, reportId }) => (
              <li key={`${reportId}-${photo.name}`}>
                <img
                  src={photo.dataUrl}
                  alt={`Obra ${work.title}, ${formatShortDate(date)}`}
                  className="aspect-video w-full rounded-md object-cover"
                />
                <p className="mt-1 text-xs text-zinc-500">{formatShortDate(date)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.days.length > 0 ? (
        <section aria-label="Diario" className="mt-6">
          <h2 className="mb-2 font-semibold">Diario de trabajos</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th scope="col" className="pb-2 font-medium">
                  Día
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Plantas
                </th>
                <th scope="col" className="pb-2 pl-4 font-medium">
                  Observaciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {report.days.slice(-12).map((day) => (
                <tr key={day.id}>
                  <td className="py-2 whitespace-nowrap">
                    {formatWeekday(day.date)} {formatShortDate(day.date)}
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatNumber(day.plants)}</td>
                  <td className="py-2 pl-4 text-zinc-600">
                    {day.incident === 'ninguna'
                      ? day.notes || '—'
                      : `${incidentLabels[day.incident]}${day.notes ? ` · ${day.notes}` : ''}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </article>
  )
}
