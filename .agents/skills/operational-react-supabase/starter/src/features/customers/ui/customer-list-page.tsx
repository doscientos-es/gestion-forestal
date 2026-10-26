import {
  ActiveFilters,
  Badge,
  Button,
  DataViewState,
  DataViewStateActions,
  DataViewStateDescription,
  DataViewStateTitle,
  FilterBar,
  FilterChip,
  FilterGroup,
  Input,
  MetricCard,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderHeading,
  PageHeaderTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectList,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@doscientos/ui'
import { useId, useState } from 'react'

import { defaultCustomerSearch, type CustomerSearch } from '../application/customer-search'
import { summarizeCustomers } from '../application/summarize-customers'
import { useCustomersQuery } from '../application/use-customers-query'
import { CustomerCreateDialog } from './customer-create-dialog'
import { customerStatusLabels, formatCurrency } from './customer-presentation'
import { CustomerTable } from './customer-table'

export function CustomerListPage({
  search,
  onSearchChange,
}: {
  search: CustomerSearch
  onSearchChange: (update: Partial<CustomerSearch>) => void
}) {
  const customersQuery = useCustomersQuery(search)
  const [announcement, setAnnouncement] = useState('')
  const searchId = useId()
  const loading = search.scenario === 'loading' || customersQuery.isPending
  const summary = summarizeCustomers(customersQuery.data ?? [])
  const hasFilters = Boolean(search.q.trim() || search.status !== 'all')
  const reset = () => onSearchChange(defaultCustomerSearch)

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderHeading>
          <PageHeaderTitle>Clientes</PageHeaderTitle>
          <PageHeaderDescription>
            Tus relaciones, contactos y fichas en un solo lugar.
          </PageHeaderDescription>
        </PageHeaderHeading>
        <PageHeaderActions>
          <CustomerCreateDialog
            onCreated={(customer) => {
              reset()
              setAnnouncement(`Se ha creado ${customer.name}. La ficha es temporal.`)
            }}
          />
        </PageHeaderActions>
      </PageHeader>

      <output className={announcement ? 'text-primary block text-sm' : 'sr-only'}>
        {announcement}
      </output>
      {search.scenario !== 'default' ? (
        <div className="border-border bg-card flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2 text-sm">
          <span>
            <Badge variant="outline">Vista de ejemplo</Badge>{' '}
            <span className="text-muted-foreground">{search.scenario}</span>
          </span>
          <Button variant="ghost" onPress={reset}>
            Volver al listado
          </Button>
        </div>
      ) : null}

      {!customersQuery.isError ? (
        <section aria-label="Resumen del resultado" className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Clientes"
            value={summary.total}
            loading={loading}
            description="En el resultado actual"
          />
          <MetricCard
            label="Activos"
            value={summary.active}
            loading={loading}
            description="En el resultado actual"
          />
          <MetricCard
            label="Valor mensual"
            value={formatCurrency(summary.monthlyValue)}
            loading={loading}
            description="Suma del resultado · EUR"
          />
        </section>
      ) : null}

      <section
        aria-labelledby="customer-list-title"
        className="border-border bg-card overflow-hidden rounded-lg border"
      >
        <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <h2 id="customer-list-title" className="text-sm font-semibold">
            Directorio de clientes
          </h2>
          <span className="text-muted-foreground text-xs">Datos de demostración</span>
        </div>
        <div className="border-border border-b p-4">
          <FilterBar aria-label="Filtros de clientes" className="justify-between">
            <FilterGroup className="w-full sm:w-auto">
              <div className="w-full sm:w-64">
                <label htmlFor={searchId} className="sr-only">
                  Buscar clientes por nombre, contacto o email
                </label>
                <Input
                  id={searchId}
                  type="search"
                  value={search.q}
                  onChange={(event) => onSearchChange({ q: event.target.value })}
                  placeholder="Buscar clientes…"
                />
              </div>
              <Select
                aria-label="Filtrar por estado"
                selectedKey={search.status}
                onSelectionChange={(key) =>
                  onSearchChange({ status: key === 'active' || key === 'trial' ? key : 'all' })
                }
                className="w-full sm:w-44"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectList>
                    <SelectItem id="all">Todos los estados</SelectItem>
                    <SelectItem id="active">Activos</SelectItem>
                    <SelectItem id="trial">En prueba</SelectItem>
                  </SelectList>
                </SelectContent>
              </Select>
            </FilterGroup>
            {hasFilters ? (
              <Button variant="ghost" onPress={reset}>
                Limpiar filtros
              </Button>
            ) : null}
          </FilterBar>
          {hasFilters ? (
            <ActiveFilters className="mt-3">
              {search.q ? (
                <FilterChip
                  aria-label="Quitar filtro de búsqueda"
                  onRemove={() => onSearchChange({ q: '' })}
                >
                  Búsqueda: {search.q}
                </FilterChip>
              ) : null}
              {search.status !== 'all' ? (
                <FilterChip
                  aria-label="Quitar filtro de estado"
                  onRemove={() => onSearchChange({ status: 'all' })}
                >
                  Estado: {customerStatusLabels[search.status]}
                </FilterChip>
              ) : null}
            </ActiveFilters>
          ) : null}
        </div>
        {loading ? (
          <LoadingState />
        ) : customersQuery.isError ? (
          <ErrorState
            onRetry={() => (search.scenario === 'error' ? reset() : void customersQuery.refetch())}
          />
        ) : customersQuery.data?.length ? (
          <CustomerTable customers={customersQuery.data} />
        ) : (
          <EmptyState onReset={reset} />
        )}
        <output className="border-border text-muted-foreground block border-t px-4 py-3 text-xs">
          {loading
            ? 'Cargando el directorio…'
            : customersQuery.isError
              ? 'Listado no disponible'
              : `${summary.total} ${summary.total === 1 ? 'cliente' : 'clientes'} · Las altas se pierden al recargar`}
        </output>
      </section>
    </div>
  )
}

function LoadingState() {
  return (
    <div aria-busy="true" aria-label="Cargando clientes" className="divide-border divide-y px-4">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} aria-hidden="true" className="flex items-center gap-4 py-4">
          <Skeleton className="size-9 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3 max-w-48" />
            <Skeleton className="h-3 w-1/2 max-w-32" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <DataViewState>
      <DataViewStateTitle>No hay clientes con esos filtros</DataViewStateTitle>
      <DataViewStateDescription>
        Modifica o restablece los filtros para continuar.
      </DataViewStateDescription>
      <DataViewStateActions>
        <Button variant="outline" onPress={onReset}>
          Restablecer listado
        </Button>
      </DataViewStateActions>
    </DataViewState>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <DataViewState aria-live="polite">
      <DataViewStateTitle>No se han podido cargar los clientes</DataViewStateTitle>
      <DataViewStateDescription>
        Tus cambios no se han perdido. Reintenta la carga del listado.
      </DataViewStateDescription>
      <DataViewStateActions>
        <Button onPress={onRetry}>Reintentar</Button>
      </DataViewStateActions>
    </DataViewState>
  )
}
