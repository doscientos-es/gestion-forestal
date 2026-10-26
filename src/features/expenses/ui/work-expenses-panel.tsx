import { Button } from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Receipt } from 'lucide-react'
import { useState } from 'react'

import {
  expenseCategory,
  expenseStatus,
  expenseTotals,
  useCurrentUser,
  useWorkspace,
  visibleExpenses,
  type Work,
} from '@/features/workspace'
import { formatMoney, formatShortDate } from '@/shared/lib/format'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

import { ExpenseDialog } from './expense-dialog'

/** Expenses charged to one work, on its detail page. Foremen see their own, the office all. */
export function WorkExpensesPanel({ work }: { work: Work }) {
  const workspace = useWorkspace()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  if (!user || user.role === 'peon') return null
  const rows = visibleExpenses(workspace, user).filter((item) => item.workId === work.id)
  const totals = expenseTotals(rows)
  const closed = work.status === 'terminada' || work.status === 'facturada'

  return (
    <Panel aria-labelledby="work-expenses-title">
      <PanelHeader
        id="work-expenses-title"
        icon={<Receipt className="size-5" strokeWidth={1.75} />}
        title="Gastos de la obra"
        description={
          totals.pending.count > 0
            ? `${formatMoney(totals.pending.amount)} por revisar`
            : 'Gasolina, herramientas, comidas…'
        }
        meta={formatMoney(totals.approved.amount)}
        action={
          closed && user.role !== 'admin' ? undefined : (
            <Button size="sm" variant="outline" onPress={() => setAdding(true)}>
              <Plus aria-hidden="true" className="size-4" /> Añadir
            </Button>
          )
        }
      />
      {rows.length === 0 ? (
        <EmptyPanel
          icon={<Receipt className="size-5" />}
          title="Sin gastos todavía"
          description="Registra aquí lo que se pague para esta obra, con la foto del ticket."
        />
      ) : (
        <ul className="divide-border divide-y">
          {rows.slice(0, 5).map((expense) => (
            <li key={expense.id} className="flex items-center gap-3 px-5 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{expense.description}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {expenseCategory[expense.category]} · {formatShortDate(expense.date)}
                </span>
              </span>
              <Tag tone={expenseStatus[expense.status].tone} dot>
                {expenseStatus[expense.status].label}
              </Tag>
              <span className="w-20 text-right text-sm font-semibold tabular-nums">
                {formatMoney(expense.amount, true)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 5 ? (
        <div className="border-border border-t px-5 py-3">
          <Button variant="link" size="sm" onPress={() => void navigate({ to: '/gastos' })}>
            Ver los {rows.length} gastos
          </Button>
        </div>
      ) : null}
      {adding ? <ExpenseDialog defaultWorkId={work.id} onClose={() => setAdding(false)} /> : null}
    </Panel>
  )
}
