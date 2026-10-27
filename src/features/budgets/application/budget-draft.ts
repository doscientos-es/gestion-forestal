import {
  suggestedYield,
  type Budget,
  type BudgetInput,
  type BudgetLine,
  type BudgetParams,
  type Workspace,
} from '@/features/workspace'

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

/**
 * Starting density and yield for a species. The yield is the company's real one when finished
 * works give a history (so new budgets stop repeating an optimistic figure), else the typical one.
 */
export function plantingDefaults(workspace: Workspace | undefined, speciesId: string) {
  const typical = speciesDefaults[speciesId] ?? { density: 1100, yieldPerDay: 300 }
  const suggestion = workspace
    ? suggestedYield(workspace, speciesId, typical.yieldPerDay)
    : { value: typical.yieldPerDay }
  return { density: typical.density, yieldPerDay: suggestion.value }
}

export function newPlantingLine(workspace?: Workspace, speciesId = 's-radiata'): BudgetLine {
  return {
    id: crypto.randomUUID(),
    kind: 'plantacion',
    speciesId,
    hectares: 5,
    ...plantingDefaults(workspace, speciesId),
  }
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

export function emptyDraft(today: string, workspace?: Workspace): BudgetInput {
  return {
    title: '',
    clientId: '',
    zoneId: '',
    date: today,
    notes: '',
    params: DEFAULT_PARAMS,
    lines: [newPlantingLine(workspace)],
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
