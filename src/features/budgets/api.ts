import {
  acceptBudget,
  apiDeps,
  createClient,
  createZone,
  importBudgets,
  mutate,
  recordBudgetView,
  respondToBudget,
  saveBudget,
  saveSpecies,
  sendBudgetEmail,
  setBudgetStatus,
  type ApiDeps,
  type Budget,
  type BudgetInput,
  type BudgetStatus,
  type Client,
  type ClientInput,
  type EmailInput,
  type ImportedBudget,
  type Species,
  type SpeciesInput,
  type Work,
  type Zone,
} from '@/features/workspace'

import { DEFAULT_PARAMS } from './application/budget-draft'

export type BudgetsApi = {
  save(input: BudgetInput, budgetId?: string): Promise<Budget>
  /** New clients and zones are created from the budget form, where they are needed. */
  createClient(input: ClientInput): Promise<Client>
  createZone(name: string): Promise<Zone>
  /** New species are also created from the budget form; the full catalogue lives in «Catálogo». */
  createSpecies(input: SpeciesInput): Promise<Species>
  setStatus(budgetId: string, status: Exclude<BudgetStatus, 'aceptado'>): Promise<void>
  /** Freezes the estimate into a new work. */
  accept(budgetId: string): Promise<Work>
  /** Simulated: records the send and moves a draft to «enviado». No email leaves the app. */
  sendEmail(budgetId: string, email: EmailInput): Promise<void>
  /** The client opened the public proposal link. */
  recordView(budgetId: string): Promise<void>
  /** The client accepts or declines from the public link; accepting creates the work. */
  respond(budgetId: string, decision: 'aceptado' | 'rechazado'): Promise<void>
  /** Creates one draft per imported work, adding the clients and zones that are missing. */
  importCsv(budgets: ImportedBudget[]): Promise<Budget[]>
}

export function createBudgetsApi(deps: ApiDeps): BudgetsApi {
  return {
    save: (input, budgetId) =>
      mutate(deps, (workspace, context) => {
        const { workspace: next, budget } = saveBudget(workspace, input, context, budgetId)
        return { workspace: next, result: budget }
      }),
    createClient: (input) =>
      mutate(deps, (workspace, context) => {
        const { workspace: next, client } = createClient(workspace, input, context)
        return { workspace: next, result: client }
      }),
    createZone: (name) =>
      mutate(deps, (workspace, context) => {
        const { workspace: next, zone } = createZone(workspace, name, context)
        return { workspace: next, result: zone }
      }),
    createSpecies: (input) =>
      mutate(deps, (workspace, context) => {
        const { workspace: next, species } = saveSpecies(workspace, input, context)
        return { workspace: next, result: species }
      }),
    setStatus: (budgetId, status) =>
      mutate(deps, (workspace, context) => ({
        workspace: setBudgetStatus(workspace, budgetId, status, context),
        result: undefined,
      })),
    accept: (budgetId) =>
      mutate(deps, (workspace, context) => {
        const { workspace: next, work } = acceptBudget(workspace, budgetId, context)
        return { workspace: next, result: work }
      }),
    sendEmail: (budgetId, email) =>
      mutate(deps, (workspace, context) => ({
        workspace: sendBudgetEmail(workspace, budgetId, email, context),
        result: undefined,
      })),
    recordView: (budgetId) =>
      mutate(deps, (workspace, context) => ({
        workspace: recordBudgetView(workspace, budgetId, { ...context, actorId: null }),
        result: undefined,
      })),
    respond: (budgetId, decision) =>
      mutate(deps, (workspace, context) => ({
        workspace: respondToBudget(workspace, budgetId, decision, context).workspace,
        result: undefined,
      })),
    importCsv: (budgets) =>
      mutate(deps, (workspace, context) => {
        const { workspace: next, budgets: created } = importBudgets(
          workspace,
          budgets,
          DEFAULT_PARAMS,
          context,
        )
        return { workspace: next, result: created }
      }),
  }
}

export const budgetsApi = createBudgetsApi(apiDeps)
