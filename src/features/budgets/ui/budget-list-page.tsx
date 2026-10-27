import { Button, DropdownMenuItem } from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { Calculator, Download, Eye, FileText, FileUp, Plus } from 'lucide-react'
import { useState } from 'react'

import {
  budgetStatus,
  budgetTracking,
  estimateStoredBudget,
  eventDate,
  lookup,
  useWorkspace,
  type Budget,
} from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { downloadTextFile } from '@/shared/lib/download'
import { formatMoney, formatNumber, formatShortDate } from '@/shared/lib/format'
import { DataTable, RowMenu } from '@/shared/ui/data-table'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { FilterTabs, FilterToolbar, SearchField, type FilterOption } from '@/shared/ui/filter-tabs'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

import { filterBudgets, type BudgetFilter } from '../application/budget-draft'
import { budgetsToCsv } from '../application/budget-export'
import { ImportBudgetsDialog } from './import-budgets-dialog'
import { SendBudgetDialog } from './send-budget-dialog'

export function BudgetListPage() {
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const open = (budgetId: string) =>
    void navigate({ to: '/presupuestos/$budgetId', params: { budgetId } })
  const [sending, setSending] = useState<Budget | null>(null)
  const [importing, setImporting] = useState(false)
  const [filter, setFilter] = useState<BudgetFilter>('todos')
  const [query, setQuery] = useState('')
  const find = lookup(workspace)
  const budgets = filterBudgets(workspace, filter, query)
  const count = (status: BudgetFilter) => filterBudgets(workspace, status, '').length
  const options: FilterOption<BudgetFilter>[] = [
    { value: 'todos', label: 'Todos', count: count('todos') },
    { value: 'borrador', label: 'Borradores', count: count('borrador') },
    { value: 'enviado', label: 'Enviados', count: count('enviado') },
    { value: 'aceptado', label: 'Aceptados', count: count('aceptado') },
    { value: 'rechazado', label: 'Rechazados', count: count('rechazado') },
  ]
  const pipeline = workspace.budgets
    .filter((budget) => budget.status === 'enviado')
    .reduce((sum, budget) => sum + estimateStoredBudget(budget, workspace.species).price, 0)

  return (
    <>
      <PageTop
        title="Presupuestos"
        description="Calcula peonadas, coste y precio a partir de superficie, densidad y rendimiento."
        actions={
          <>
            <Button variant="outline" onPress={() => setImporting(true)}>
              <FileUp aria-hidden="true" className="size-4" /> Importar CSV
            </Button>
            <Button
              variant="outline"
              isDisabled={budgets.length === 0}
              onPress={() =>
                downloadTextFile(
                  `presupuestos-${clock.today()}.csv`,
                  budgetsToCsv(workspace, budgets),
                )
              }
            >
              <Download aria-hidden="true" className="size-4" /> Exportar
            </Button>
            <Button onPress={() => void navigate({ to: '/presupuestos/nuevo' })}>
              <Plus aria-hidden="true" className="size-4" />
              Nuevo presupuesto
            </Button>
          </>
        }
      />
      <FilterToolbar
        tabs={
          <FilterTabs
            label="Filtrar por estado"
            options={options}
            value={filter}
            onChange={setFilter}
          />
        }
      >
        <SearchField
          label="Buscar presupuestos"
          value={query}
          onChange={setQuery}
          placeholder="Número, obra o cliente"
        />
      </FilterToolbar>
      <Panel aria-labelledby="budgets-title">
        <PanelHeader
          id="budgets-title"
          icon={<Calculator className="size-5" strokeWidth={1.75} />}
          title="Presupuestos"
          meta={`${formatNumber(budgets.length)} de ${formatNumber(workspace.budgets.length)}`}
        />
        {budgets.length === 0 ? (
          <EmptyPanel
            icon={<FileText className="size-5" />}
            title="No hay presupuestos con estos filtros"
            description="Prueba con otro estado o borra la búsqueda."
          />
        ) : (
          <DataTable
            label="Presupuestos"
            rows={budgets}
            getKey={(budget) => budget.id}
            openLabel={(budget) => `Abrir presupuesto ${budget.number}, ${budget.title}`}
            onOpen={(budget) => open(budget.id)}
            footer={
              <span>
                Pendiente de respuesta{' '}
                <span className="text-foreground font-semibold tabular-nums">
                  {formatMoney(pipeline)}
                </span>
              </span>
            }
            columns={[
              {
                id: 'title',
                header: 'Presupuesto',
                cell: (budget) => (
                  <>
                    <span className="block truncate text-sm font-semibold">{budget.title}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {budget.number} · {find.client(budget.clientId)?.name}
                    </span>
                  </>
                ),
              },
              {
                id: 'status',
                header: 'Estado',
                secondary: true,
                cell: (budget) => {
                  const status = budgetStatus[budget.status]
                  return (
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  )
                },
              },
              {
                id: 'tracking',
                header: 'Seguimiento',
                secondary: true,
                className: 'text-muted-foreground text-sm',
                cell: (budget) => {
                  const tracking = budgetTracking(workspace.activity, budget.id)
                  if (!tracking.sentAt)
                    return <span className="text-muted-foreground/70">Sin enviar</span>
                  return (
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      {formatShortDate(eventDate({ at: tracking.sentAt }))}
                      <span aria-hidden="true">·</span>
                      <Eye aria-hidden="true" className="size-3.5" />
                      <span
                        className={tracking.views === 0 ? 'font-medium text-amber-700' : undefined}
                      >
                        {tracking.views === 0 ? 'Sin abrir' : `${formatNumber(tracking.views)}×`}
                      </span>
                    </span>
                  )
                },
              },
              {
                id: 'scope',
                header: 'Alcance',
                secondary: true,
                className: 'text-muted-foreground text-sm tabular-nums',
                cell: (budget) => {
                  const estimate = estimateStoredBudget(budget, workspace.species)
                  return `${formatNumber(estimate.plants)} pl · ${formatNumber(estimate.crewDays)} días`
                },
              },
              {
                id: 'date',
                header: 'Fecha',
                secondary: true,
                className: 'text-muted-foreground text-sm',
                cell: (budget) => formatShortDate(budget.date),
              },
              {
                id: 'price',
                header: 'Precio',
                align: 'right',
                className: 'font-semibold tabular-nums',
                cell: (budget) =>
                  formatMoney(estimateStoredBudget(budget, workspace.species).price),
              },
            ]}
            actions={(budget) => (
              <RowMenu label={`Acciones de ${budget.number}`}>
                <DropdownMenuItem onAction={() => open(budget.id)}>Abrir</DropdownMenuItem>
                {budget.status === 'borrador' || budget.status === 'enviado' ? (
                  <DropdownMenuItem
                    onAction={() =>
                      void navigate({
                        to: '/presupuestos/$budgetId/editar',
                        params: { budgetId: budget.id },
                      })
                    }
                  >
                    Editar
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onAction={() =>
                    void navigate({ to: '/presupuestos/nuevo', search: { desde: budget.id } })
                  }
                >
                  Duplicar
                </DropdownMenuItem>
                {budget.status === 'borrador' || budget.status === 'enviado' ? (
                  <DropdownMenuItem onAction={() => setSending(budget)}>
                    {budget.status === 'enviado' ? 'Reenviar al cliente' : 'Enviar al cliente'}
                  </DropdownMenuItem>
                ) : null}
              </RowMenu>
            )}
          />
        )}
      </Panel>
      <SendBudgetDialog budget={sending} onClose={() => setSending(null)} />
      <ImportBudgetsDialog open={importing} onOpenChange={setImporting} />
    </>
  )
}
