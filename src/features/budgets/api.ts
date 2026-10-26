import {
  acceptBudget,
  apiDeps,
  commandContext,
  createClient,
  createZone,
  mutate,
  saveBudget,
  setBudgetStatus,
  type ApiDeps,
  type Budget,
  type BudgetInput,
  type BudgetStatus,
  type Client,
  type ClientInput,
  type Work,
  type Zone,
} from '@/features/workspace'

export type BudgetsApi = {
  save(input: BudgetInput, budgetId?: string): Promise<Budget>
  /** New clients and zones are created from the budget form, where they are needed. */
  createClient(input: ClientInput): Promise<Client>
  createZone(name: string): Promise<Zone>
  setStatus(budgetId: string, status: Exclude<BudgetStatus, 'aceptado'>): Promise<void>
  /** Freezes the estimate into a new work. */
  accept(budgetId: string): Promise<Work>
}

export function createBudgetsApi(deps: ApiDeps): BudgetsApi {
  return {
    save: (input, budgetId) =>
      mutate(deps, (workspace) => {
        const { workspace: next, budget } = saveBudget(
          workspace,
          input,
          commandContext(deps),
          budgetId,
        )
        return { workspace: next, result: budget }
      }),
    createClient: (input) =>
      mutate(deps, (workspace) => {
        const { workspace: next, client } = createClient(workspace, input, commandContext(deps))
        return { workspace: next, result: client }
      }),
    createZone: (name) =>
      mutate(deps, (workspace) => {
        const { workspace: next, zone } = createZone(workspace, name, commandContext(deps))
        return { workspace: next, result: zone }
      }),
    setStatus: (budgetId, status) =>
      mutate(deps, (workspace) => ({
        workspace: setBudgetStatus(workspace, budgetId, status),
        result: undefined,
      })),
    accept: (budgetId) =>
      mutate(deps, (workspace) => {
        const { workspace: next, work } = acceptBudget(workspace, budgetId, commandContext(deps))
        return { workspace: next, result: work }
      }),
  }
}

export const budgetsApi = createBudgetsApi(apiDeps)
