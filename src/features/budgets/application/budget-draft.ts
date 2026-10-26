import type { Budget, BudgetInput, BudgetLine, BudgetParams, Workspace } from '@/features/workspace'

export const DEFAULT_PARAMS: BudgetParams = {
  crewSize: 5,
  dailyCost: 16_000,
  travelPerCrewDay: 9_000,
  targetMargin: 0.2,
}

/** Typical yields per species, used only as starting values for a new line. */
const speciesDefaults: Record<string, { density: number; yieldPerDay: number }> = {
  's-radiata': { density: 1600, yieldPerDay: 420 },
  's-laricio': { density: 1500, yieldPerDay: 430 },
  's-roble': { density: 1100, yieldPerDay: 300 },
  's-haya': { density: 1200, yieldPerDay: 280 },
  's-castano': { density: 800, yieldPerDay: 260 },
  's-abedul': { density: 1100, yieldPerDay: 320 },
}

export function newPlantingLine(speciesId = 's-radiata'): BudgetLine {
  const defaults = speciesDefaults[speciesId] ?? { density: 1100, yieldPerDay: 300 }
  return { id: crypto.randomUUID(), kind: 'plantacion', speciesId, hectares: 5, ...defaults }
}

export function newTreatmentLine(): BudgetLine {
  return {
    id: crypto.randomUUID(),
    kind: 'tratamiento',
    description: 'Desbroce previo',
    hectares: 5,
    hectaresPerDay: 0.5,
  }
}

export function speciesDefaultsFor(speciesId: string) {
  return speciesDefaults[speciesId] ?? null
}

export function emptyDraft(today: string): BudgetInput {
  return {
    title: '',
    clientId: '',
    zoneId: '',
    date: today,
    notes: '',
    params: DEFAULT_PARAMS,
    lines: [newPlantingLine()],
  }
}

export function draftFromBudget(budget: Budget): BudgetInput {
  return {
    title: budget.title,
    clientId: budget.clientId,
    zoneId: budget.zoneId,
    date: budget.date,
    notes: budget.notes,
    params: budget.params,
    lines: budget.lines,
  }
}

export function duplicateDraft(budget: Budget, today: string): BudgetInput {
  return {
    ...draftFromBudget(budget),
    title: `${budget.title} (copia)`,
    date: today,
    lines: budget.lines.map((line) => ({ ...line, id: crypto.randomUUID() })),
  }
}

export function updateLine(
  lines: BudgetLine[],
  lineId: string,
  patch: Partial<BudgetLine>,
): BudgetLine[] {
  return lines.map((line) => (line.id === lineId ? ({ ...line, ...patch } as BudgetLine) : line))
}

export type BudgetFilter = 'todos' | Budget['status']

export function filterBudgets(workspace: Workspace, filter: BudgetFilter, query: string) {
  const text = query.trim().toLocaleLowerCase('es')
  return workspace.budgets.filter((budget) => {
    if (filter !== 'todos' && budget.status !== filter) return false
    if (!text) return true
    const client = workspace.clients.find((item) => item.id === budget.clientId)?.name ?? ''
    return `${budget.number} ${budget.title} ${client}`.toLocaleLowerCase('es').includes(text)
  })
}
