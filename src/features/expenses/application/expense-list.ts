import {
  expenseCategory,
  lookup,
  missingInvoice,
  needsReimbursement,
  type Expense,
  type ExpenseCategory,
  type Workspace,
} from '@/features/workspace'
import { csvDecimal, csvText, toCsv } from '@/shared/lib/csv'

export type ExpenseFilter = 'todos' | 'pendiente' | 'aprobado' | 'rechazado'

export type ExpenseQuery = {
  status: ExpenseFilter
  category: ExpenseCategory | 'todas'
  /** Work id, or `todas`. */
  workId: string
  text: string
}

/** Applies every filter; `status` can be skipped so tab counters ignore their own filter. */
export function filterExpenses(
  workspace: Workspace,
  expenses: Expense[],
  query: ExpenseQuery,
  ignoreStatus = false,
) {
  const find = lookup(workspace)
  const text = query.text.trim().toLowerCase()
  return expenses.filter((expense) => {
    if (!ignoreStatus && query.status !== 'todos' && expense.status !== query.status) return false
    if (query.category !== 'todas' && expense.category !== query.category) return false
    if (query.workId !== 'todas' && expense.workId !== query.workId) return false
    if (!text) return true
    const work = find.work(expense.workId ?? '')
    const author = find.person(expense.createdBy)
    return `${expense.description} ${work?.code ?? ''} ${work?.title ?? ''} ${author?.name ?? ''} ${expense.invoiceNumber}`
      .toLowerCase()
      .includes(text)
  })
}

/** Spreadsheet for the accountant: one row per expense, with what is still missing. */
export function expensesToCsv(workspace: Workspace, expenses: Expense[]) {
  const find = lookup(workspace)
  return toCsv(
    [
      'Fecha',
      'Obra',
      'Código obra',
      'Categoría',
      'Concepto',
      'Importe (IVA incl.)',
      'Registrado por',
      'Pagado con',
      'Estado',
      'Nº factura',
      'Falta factura',
      'Pendiente de reembolso',
    ],
    expenses.map((expense) => {
      const work = find.work(expense.workId ?? '')
      return [
        expense.date,
        csvText(work?.title ?? 'General'),
        work?.code ?? '',
        csvText(expenseCategory[expense.category]),
        csvText(expense.description),
        csvDecimal(expense.amount / 100),
        csvText(find.person(expense.createdBy)?.name ?? ''),
        expense.paidWith === 'propio' ? 'Adelantado por la persona' : 'Empresa',
        expense.status,
        csvText(expense.invoiceNumber),
        missingInvoice(expense) ? 'Sí' : 'No',
        needsReimbursement(expense) ? 'Sí' : 'No',
      ]
    }),
  )
}
