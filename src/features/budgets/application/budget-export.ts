import {
  budgetStatus,
  budgetTracking,
  estimateStoredBudget,
  lookup,
  type Budget,
  type Workspace,
} from '@/features/workspace'
import { csvDecimal, csvText, toCsv } from '@/shared/lib/csv'

/** Spreadsheet export of the budgets as listed: figures, status and client follow-up. */
export function budgetsToCsv(workspace: Workspace, budgets: Budget[]) {
  const find = lookup(workspace)
  const euros = (cents: number) => csvDecimal(cents / 100)
  return toCsv(
    [
      'Número',
      'Fecha',
      'Obra',
      'Cliente',
      'Zona',
      'Estado',
      'Hectáreas',
      'Plantas',
      'Peonadas',
      'Días de cuadrilla',
      'Coste',
      'Precio',
      'Margen %',
      'Enviado el',
      'Aperturas',
    ],
    budgets.map((budget) => {
      const estimate = estimateStoredBudget(budget, workspace.species)
      const tracking = budgetTracking(workspace.activity, budget.id)
      return [
        budget.number,
        budget.date,
        csvText(budget.title),
        csvText(find.client(budget.clientId)?.name ?? ''),
        csvText(find.zone(budget.zoneId)?.name ?? ''),
        budgetStatus[budget.status].label,
        csvDecimal(estimate.hectares),
        estimate.plants,
        csvDecimal(estimate.workerDays, 1),
        estimate.crewDays,
        euros(estimate.totalCost),
        euros(estimate.price),
        csvDecimal(estimate.marginRate * 100, 1),
        tracking.sentAt?.slice(0, 10) ?? '',
        tracking.views,
      ]
    }),
  )
}
