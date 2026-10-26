import {
  apiDeps,
  attachInvoice,
  commandContext,
  createExpense,
  markReimbursed,
  mutate,
  removeExpense,
  reviewExpense,
  updateExpense,
  type ApiDeps,
  type Attachment,
  type Expense,
  type ExpenseDecision,
  type ExpenseInput,
  type Person,
  type Workspace,
} from '@/features/workspace'
import { DomainError } from '@/shared/lib/errors'

export type ExpensesApi = {
  create(actorId: string, input: ExpenseInput): Promise<Expense>
  update(actorId: string, expenseId: string, input: ExpenseInput): Promise<void>
  review(actorId: string, expenseId: string, decision: ExpenseDecision): Promise<void>
  attachInvoice(
    actorId: string,
    expenseId: string,
    invoice: { number: string; file: Attachment | null },
  ): Promise<void>
  markReimbursed(actorId: string, expenseId: string): Promise<void>
  remove(actorId: string, expenseId: string): Promise<void>
}

function actorOf(workspace: Workspace, actorId: string): Person {
  const actor = workspace.people.find((person) => person.id === actorId)
  if (!actor) throw new DomainError('Usuario no encontrado.')
  return actor
}

export function createExpensesApi(deps: ApiDeps): ExpensesApi {
  const run = <T>(
    actorId: string,
    operation: (workspace: Workspace, actor: Person) => { workspace: Workspace; result: T },
  ) => mutate(deps, (workspace) => operation(workspace, actorOf(workspace, actorId)))
  const only = (workspace: Workspace) => ({ workspace, result: undefined })

  return {
    create: (actorId, input) =>
      run(actorId, (workspace, actor) => {
        const { workspace: next, expense } = createExpense(
          workspace,
          input,
          actor,
          commandContext(deps),
        )
        return { workspace: next, result: expense }
      }),
    update: (actorId, expenseId, input) =>
      run(actorId, (workspace, actor) =>
        only(updateExpense(workspace, expenseId, input, actor, commandContext(deps))),
      ),
    review: (actorId, expenseId, decision) =>
      run(actorId, (workspace, actor) =>
        only(reviewExpense(workspace, expenseId, decision, actor, commandContext(deps))),
      ),
    attachInvoice: (actorId, expenseId, invoice) =>
      run(actorId, (workspace, actor) => only(attachInvoice(workspace, expenseId, invoice, actor))),
    markReimbursed: (actorId, expenseId) =>
      run(actorId, (workspace, actor) =>
        only(markReimbursed(workspace, expenseId, actor, commandContext(deps))),
      ),
    remove: (actorId, expenseId) =>
      run(actorId, (workspace, actor) => only(removeExpense(workspace, expenseId, actor))),
  }
}

export const expensesApi = createExpensesApi(apiDeps)
