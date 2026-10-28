import { Button, DropdownMenuItem, MetricCard, MetricGrid } from '@doscientos/ui'
import { Download, Plus, Receipt } from 'lucide-react'
import { useState } from 'react'

import {
  expenseCategory,
  expenseStatus,
  expenseTotals,
  lookup,
  missingInvoice,
  needsReimbursement,
  useCurrentUser,
  useWorkspace,
  visibleExpenses,
  type Expense,
  type ExpenseCategory,
} from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { downloadTextFile } from '@/shared/lib/download'
import { formatMoney, formatNumber, formatShortDate } from '@/shared/lib/format'
import { useUrlState, useUrlText } from '@/shared/lib/use-url-state'
import { DataTable, RowMenu } from '@/shared/ui/data-table'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { FilterTabs, FilterToolbar, SearchField, type FilterOption } from '@/shared/ui/filter-tabs'
import { ChoiceField } from '@/shared/ui/form-controls'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

import { expensesToCsv, filterExpenses, type ExpenseFilter } from '../application/expense-list'
import { ExpenseDialog } from './expense-dialog'
import { ExpenseDrawer } from './expense-drawer'

export function ExpensesPage() {
  const workspace = useWorkspace()
  const user = useCurrentUser()
  const find = lookup(workspace)
  const [status, setStatus] = useUrlState<ExpenseFilter>('estado', 'todos', [
    'todos',
    'pendiente',
    'aprobado',
    'rechazado',
  ])
  const [category, setCategory] = useUrlState<ExpenseCategory | 'todas'>('categoria', 'todas', [
    'todas',
    ...(Object.keys(expenseCategory) as ExpenseCategory[]),
  ])
  const [workId, setWorkId] = useState('todas')
  const [text, setText] = useUrlText('q')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  if (!user) return null
  const office = user.role === 'admin'
  const mine = visibleExpenses(workspace, user)
  const totals = expenseTotals(mine)
  const query = { status, category, workId, text }
  const rows = filterExpenses(workspace, mine, query)
  const count = (value: ExpenseFilter) =>
    filterExpenses(workspace, mine, { ...query, status: value }, true).filter(
      (item) => value === 'todos' || item.status === value,
    ).length
  const options: FilterOption<ExpenseFilter>[] = [
    { value: 'todos', label: 'Todos', count: count('todos') },
    { value: 'pendiente', label: 'Por revisar', count: count('pendiente') },
    { value: 'aprobado', label: 'Aprobados', count: count('aprobado') },
    { value: 'rechazado', label: 'Rechazados', count: count('rechazado') },
  ]
  const workIds = [...new Set(mine.flatMap((item) => (item.workId ? [item.workId] : [])))]
  const total = rows.reduce((sum, item) => sum + item.amount, 0)

  return (
    <>
      <PageTop
        title="Gastos"
        description={
          office
            ? 'Lo que la cuadrilla va pagando: revísalo, adjunta la factura y devuelve lo adelantado.'
            : 'Registra lo que pagas por la obra (gasolina, herramientas…) con la foto del ticket.'
        }
        actions={
          <>
            {office ? (
              <Button
                variant="outline"
                isDisabled={rows.length === 0}
                onPress={() =>
                  downloadTextFile(`gastos-${clock.today()}.csv`, expensesToCsv(workspace, rows))
                }
              >
                <Download aria-hidden="true" className="size-4" /> Descargar CSV
              </Button>
            ) : null}
            <Button onPress={() => setCreating(true)}>
              <Plus aria-hidden="true" className="size-4" /> Nuevo gasto
            </Button>
          </>
        }
      />
      <MetricGrid className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Por revisar"
          value={formatMoney(totals.pending.amount)}
          description={`${formatNumber(totals.pending.count)} gastos`}
        />
        <MetricCard
          label="Aprobado"
          value={formatMoney(totals.approved.amount)}
          description={`${formatNumber(totals.approved.count)} gastos`}
        />
        <MetricCard
          label={office ? 'Por reembolsar' : 'Te deben'}
          value={formatMoney(totals.reimburse.amount)}
          description={`${formatNumber(totals.reimburse.count)} adelantados`}
        />
        <MetricCard
          label="Sin factura"
          value={formatNumber(totals.noInvoice)}
          description="Aprobados que la necesitan"
        />
      </MetricGrid>
      <FilterToolbar
        tabs={
          <FilterTabs
            label="Filtrar por estado"
            options={options}
            value={status}
            onChange={setStatus}
          />
        }
      >
        <ChoiceField
          hideLabel
          className="w-44 shrink-0"
          label="Categoría"
          value={category}
          onChange={(value) => setCategory(value as ExpenseCategory | 'todas')}
          options={[
            { value: 'todas', label: 'Todas las categorías' },
            ...Object.entries(expenseCategory).map(([value, label]) => ({ value, label })),
          ]}
        />
        <ChoiceField
          hideLabel
          className="hidden w-44 shrink-0 lg:flex"
          label="Obra"
          value={workId}
          onChange={setWorkId}
          options={[
            { value: 'todas', label: 'Todas las obras' },
            ...workIds.map((id) => ({ value: id, label: find.work(id)?.code ?? id })),
          ]}
        />
        <SearchField
          label="Buscar gastos"
          value={text}
          onChange={setText}
          placeholder="Concepto, obra o persona"
        />
      </FilterToolbar>
      <Panel aria-labelledby="expenses-title">
        <PanelHeader
          id="expenses-title"
          icon={<Receipt className="size-5" strokeWidth={1.75} />}
          title="Gastos"
          meta={`${formatNumber(rows.length)} · ${formatMoney(total)}`}
        />
        {rows.length === 0 ? (
          <EmptyPanel
            icon={<Receipt className="size-5" />}
            title={mine.length === 0 ? 'Aún no hay gastos' : 'No hay gastos con estos filtros'}
            description={
              mine.length === 0
                ? 'Registra el primero con «Nuevo gasto»: basta el importe y la foto del ticket.'
                : 'Cambia el estado, la categoría o la búsqueda.'
            }
            {...(mine.length === 0
              ? {
                action: (
                  <Button onPress={() => setCreating(true)}>
                    <Plus aria-hidden="true" className="size-4" /> Nuevo gasto
                  </Button>
                ),
              }
              : {})}
          />
        ) : (
          <DataTable
            label="Gastos"
            rows={rows}
            getKey={(row) => row.id}
            openLabel={(row) => `Abrir gasto ${row.description}`}
            onOpen={(row) => setOpenId(row.id)}
            columns={[
              {
                id: 'what',
                header: 'Gasto',
                cell: (row) => (
                  <>
                    <span className="block truncate text-sm font-semibold">{row.description}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {expenseCategory[row.category]} ·{' '}
                      {row.workId ? (find.work(row.workId)?.code ?? '') : 'General'}
                      {office ? ` · ${find.person(row.createdBy)?.name ?? ''}` : ''}
                    </span>
                  </>
                ),
              },
              {
                id: 'date',
                header: 'Fecha',
                secondary: true,
                className: 'text-muted-foreground text-sm',
                cell: (row) => formatShortDate(row.date),
              },
              {
                id: 'flags',
                header: 'Pendiente',
                secondary: true,
                cell: (row) =>
                  missingInvoice(row) ? (
                    <Tag tone="amber">Falta factura</Tag>
                  ) : needsReimbursement(row) ? (
                    <Tag tone="blue">Por reembolsar</Tag>
                  ) : null,
              },
              {
                id: 'status',
                header: 'Estado',
                cell: (row) => (
                  <Tag tone={expenseStatus[row.status].tone} dot>
                    {expenseStatus[row.status].label}
                  </Tag>
                ),
              },
              {
                id: 'amount',
                header: 'Importe',
                align: 'right',
                className: 'font-semibold tabular-nums',
                cell: (row) => formatMoney(row.amount, true),
              },
            ]}
            actions={(row) => (
              <RowMenu label={`Acciones del gasto ${row.description}`}>
                <DropdownMenuItem onAction={() => setOpenId(row.id)}>Abrir</DropdownMenuItem>
                {office || (row.createdBy === user.id && row.status !== 'aprobado') ? (
                  <DropdownMenuItem onAction={() => setEditing(row)}>Editar</DropdownMenuItem>
                ) : null}
              </RowMenu>
            )}
          />
        )}
      </Panel>
      {creating ? <ExpenseDialog onClose={() => setCreating(false)} /> : null}
      {editing ? <ExpenseDialog expense={editing} onClose={() => setEditing(null)} /> : null}
      <ExpenseDrawer expenseId={openId} onClose={() => setOpenId(null)} onEdit={setEditing} />
    </>
  )
}
