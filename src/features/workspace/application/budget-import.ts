import { csvDecimal, csvText, parseCsv, toCsv } from '@/shared/lib/csv'

import { CommandError, createClient, createZone, saveBudget, type Context } from './commands'
import type { Budget, BudgetLine, BudgetParams, Workspace } from './model'

/** One CSV row is one budget line; rows with the same work and client form one budget. */
export const BUDGET_CSV_HEADER = [
  'Obra',
  'Cliente',
  'Zona',
  'Tipo',
  'Especie o tarea',
  'Hectáreas',
  'Densidad (pl/ha)',
  'Rendimiento (pl o ha por peón y día)',
]

export function budgetCsvTemplate(workspace: Workspace) {
  const species = workspace.species[0]?.name ?? 'Pino radiata'
  const client = workspace.clients[0]?.name ?? 'Ayuntamiento de ejemplo'
  const zone = workspace.zones[0]?.name ?? 'Valle Norte'
  const row = (kind: string, what: string, ha: number, density: string, yieldPerDay: number) => [
    csvText('Repoblación de ejemplo'),
    csvText(client),
    csvText(zone),
    kind,
    csvText(what),
    csvDecimal(ha),
    density,
    csvDecimal(yieldPerDay),
  ]
  return toCsv(BUDGET_CSV_HEADER.map(csvText), [
    row('plantación', species, 12, '1600', 420),
    row('tratamiento', 'Desbroce previo', 12, '', 0.5),
  ])
}

export type ImportedLine =
  | Omit<Extract<BudgetLine, { kind: 'plantacion' }>, 'id'>
  | Omit<Extract<BudgetLine, { kind: 'tratamiento' }>, 'id'>

export type ImportedBudget = {
  title: string
  clientName: string
  zoneName: string
  /** Null when the client does not exist yet: it is created on import. */
  clientId: string | null
  zoneId: string | null
  lines: ImportedLine[]
}

export type ImportIssue = { line: number; message: string }
export type BudgetImportPreview = { budgets: ImportedBudget[]; issues: ImportIssue[] }

const plain = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/** Accepts «1.250,5», «1250,5» and «1250.5». */
function toNumber(value: string) {
  const text = value.replace(/\s/g, '')
  const normalized = text.includes(',') ? text.replaceAll('.', '').replace(',', '.') : text
  return normalized === '' ? Number.NaN : Number(normalized)
}

type Parsed = { key: string; budget: Omit<ImportedBudget, 'lines'>; line: ImportedLine }

function parseRow(cells: string[], workspace: Workspace): Parsed | string {
  const [
    title = '',
    client = '',
    zone = '',
    kind = '',
    what = '',
    ha = '',
    density = '',
    perDay = '',
  ] = cells
  if (!title) return 'Falta el nombre de la obra.'
  if (!client) return 'Falta el cliente.'
  if (!zone) return 'Falta la zona.'
  const hectares = toNumber(ha)
  if (!(hectares > 0)) return 'La superficie debe ser un número mayor que 0.'
  const rate = toNumber(perDay)
  const budget = {
    title,
    clientName: client,
    zoneName: zone,
    clientId: workspace.clients.find((item) => plain(item.name) === plain(client))?.id ?? null,
    zoneId: workspace.zones.find((item) => plain(item.name) === plain(zone))?.id ?? null,
  }
  const key = `${plain(title)}|${plain(client)}`
  if (plain(kind).startsWith('trat')) {
    if (!what) return 'Describe el tratamiento.'
    if (!(rate > 0)) return 'El rendimiento (ha por peón y día) debe ser mayor que 0.'
    return {
      key,
      budget,
      line: { kind: 'tratamiento', description: what, hectares, hectaresPerDay: rate },
    }
  }
  if (!plain(kind).startsWith('plant')) return 'El tipo debe ser «plantación» o «tratamiento».'
  const species = workspace.species.find((item) => plain(item.name) === plain(what))
  if (!species) return `La especie «${what}» no está en el catálogo.`
  const plantsPerHa = toNumber(density)
  if (!(plantsPerHa > 0) || !(rate > 0)) return 'Densidad y rendimiento deben ser mayores que 0.'
  return {
    key,
    budget,
    line: {
      kind: 'plantacion',
      speciesId: species.id,
      hectares,
      density: plantsPerHa,
      yieldPerDay: rate,
    },
  }
}

/** Reads the CSV and reports, row by row, what can be imported. Nothing is saved here. */
export function parseBudgetCsv(text: string, workspace: Workspace): BudgetImportPreview {
  const rows = parseCsv(text)
  const hasHeader = plain(rows[0]?.[0] ?? '') === 'obra'
  const data = hasHeader ? rows.slice(1) : rows
  const issues: ImportIssue[] = []
  const groups = new Map<string, { budget: ImportedBudget; failed: boolean }>()
  data.forEach((cells, index) => {
    const line = index + (hasHeader ? 2 : 1)
    const parsed = parseRow(cells, workspace)
    const key =
      typeof parsed === 'string' ? `${plain(cells[0] ?? '')}|${plain(cells[1] ?? '')}` : parsed.key
    const group = groups.get(key) ?? {
      budget:
        typeof parsed === 'string'
          ? {
              title: cells[0] ?? '',
              clientName: cells[1] ?? '',
              zoneName: cells[2] ?? '',
              clientId: null,
              zoneId: null,
              lines: [],
            }
          : { ...parsed.budget, lines: [] },
      failed: false,
    }
    if (typeof parsed === 'string') {
      group.failed = true
      issues.push({ line, message: parsed })
    } else group.budget.lines.push(parsed.line)
    groups.set(key, group)
  })
  const budgets = [...groups.values()].filter((group) => !group.failed).map((group) => group.budget)
  return { budgets, issues }
}

/** Creates one draft budget per imported work, adding the clients and zones that do not exist. */
export function importBudgets(
  workspace: Workspace,
  imported: ImportedBudget[],
  params: BudgetParams,
  context: Context,
): { workspace: Workspace; budgets: Budget[] } {
  if (imported.length === 0) throw new CommandError('No hay presupuestos válidos que importar.')
  let next = workspace
  const budgets: Budget[] = []
  for (const item of imported) {
    // Look again: an earlier imported budget may already have created this client or zone.
    let clientId =
      item.clientId ?? next.clients.find((c) => plain(c.name) === plain(item.clientName))?.id
    if (!clientId) {
      const created = createClient(
        next,
        { name: item.clientName, kind: 'empresa', taxId: '', town: '' },
        context,
      )
      next = created.workspace
      clientId = created.client.id
    }
    let zoneId = item.zoneId ?? next.zones.find((z) => plain(z.name) === plain(item.zoneName))?.id
    if (!zoneId) {
      const created = createZone(next, item.zoneName, context)
      next = created.workspace
      zoneId = created.zone.id
    }
    const lines = item.lines.map((line) => ({ ...line, id: context.id() }) as BudgetLine)
    const saved = saveBudget(
      next,
      {
        title: item.title,
        clientId,
        zoneId,
        date: context.today,
        lines,
        params,
        notes: 'Importado desde CSV.',
      },
      context,
      undefined,
      'csv',
    )
    next = saved.workspace
    budgets.push(saved.budget)
  }
  return { workspace: next, budgets }
}
