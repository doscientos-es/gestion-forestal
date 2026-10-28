import { formatNumber } from '@/shared/lib/format'

import type { Work, Workspace } from './model'

/**
 * One suggested check per line of the budget the work came from, worded for the crew
 * («Plantar 16 ha de Pino laricio»). Lines already written as tasks are left out.
 */
export function suggestTasks(workspace: Workspace, work: Work): string[] {
  const budget = workspace.budgets.find((item) => item.id === work.budgetId)
  if (!budget) return []
  const existing = new Set(
    workspace.tasks.filter((task) => task.workId === work.id).map((task) => task.text.toLowerCase()),
  )
  return budget.lines
    .map((line) => {
      if (line.kind === 'tratamiento')
        return `${line.description} · ${formatNumber(line.hectares, 2)} ha`
      const species = workspace.species.find((item) => item.id === line.speciesId)?.name ?? 'planta'
      return `Plantar ${formatNumber(line.hectares, 2)} ha de ${species} (${formatNumber(line.density)} pl/ha)`
    })
    .filter((text) => !existing.has(text.toLowerCase()))
}
