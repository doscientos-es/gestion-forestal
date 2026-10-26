import { incidentLabels, lookup, type Workspace } from '@/features/workspace'
import { csvDecimal, csvText, toCsv } from '@/shared/lib/csv'

import { assignmentStatusLabel, type AssignmentRecord } from './plan-records'

/** One row per assignment: the planning history, ready for a spreadsheet. */
export function assignmentsToCsv(records: AssignmentRecord[]) {
  return toCsv(
    [
      'Código obra',
      'Obra',
      'Cliente',
      'Zona',
      'Cuadrilla',
      'Capataz',
      'Inicio',
      'Fin',
      'Días laborables',
      'Personas',
      'Estado',
      'Plantas presupuestadas (obra)',
      'Plantas puestas (periodo)',
      'Ausentes',
    ],
    records.map((record) => [
      record.work.code,
      csvText(record.work.title),
      csvText(record.clientName),
      csvText(record.zoneName),
      csvText(record.crewName),
      csvText(record.foremanName),
      record.assignment.start,
      record.assignment.end,
      record.days,
      record.people,
      assignmentStatusLabel[record.status],
      record.work.planned.plants,
      record.actualPlants,
      csvText(record.absentees.join(', ')),
    ]),
  )
}

/** One row per daily report of the listed assignments (what was really done each day). */
export function reportsToCsv(workspace: Workspace, records: AssignmentRecord[]) {
  const find = lookup(workspace)
  const reports = workspace.reports
    .filter((report) =>
      records.some(
        ({ assignment }) =>
          assignment.workId === report.workId &&
          assignment.crewId === report.crewId &&
          report.date >= assignment.start &&
          report.date <= assignment.end,
      ),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
  return toCsv(
    ['Fecha', 'Código obra', 'Obra', 'Cuadrilla', 'Personas', 'Plantas', 'Hectáreas', 'Incidencia'],
    reports.map((report) => [
      report.date,
      find.work(report.workId)?.code ?? '',
      csvText(find.work(report.workId)?.title ?? ''),
      csvText(find.crew(report.crewId)?.name ?? ''),
      report.workerIds.length,
      report.plants,
      csvDecimal(report.hectares),
      csvText(incidentLabels[report.incident]),
    ]),
  )
}
