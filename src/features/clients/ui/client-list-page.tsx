import { Button, DropdownMenuItem, MetricCard, MetricGrid } from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { Plus, UserRound } from 'lucide-react'
import { useState } from 'react'

import { YieldDeviation } from '@/features/works'
import {
  clientKind,
  clientOverview,
  maskIban,
  useWorkspace,
  type Client,
  type ClientKind,
} from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { formatMoney, formatNumber, formatPercent, pluralize } from '@/shared/lib/format'
import { useUrlState, useUrlText } from '@/shared/lib/use-url-state'
import { DataTable, RowMenu } from '@/shared/ui/data-table'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { FilterTabs, FilterToolbar, SearchField, type FilterOption } from '@/shared/ui/filter-tabs'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

import { ClientDialog } from './client-dialog'

type KindFilter = 'todos' | ClientKind

const kinds = Object.keys(clientKind) as ClientKind[]

const matches = (client: Client, query: string) => {
  const needle = query.trim().toLowerCase()
  return (
    !needle ||
    [client.name, client.taxId, client.town, client.email].some((text) =>
      text.toLowerCase().includes(needle),
    )
  )
}

/** Every client with what they have contracted and how those works are performing. */
export function ClientsPage() {
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useUrlState<KindFilter>('tipo', 'todos', ['todos', ...kinds])
  const [query, setQuery] = useUrlText('q')
  const open = (clientId: string) =>
    void navigate({ to: '/clientes/$clientId', params: { clientId } })
  const count = (kind: KindFilter) =>
    workspace.clients.filter((client) => kind === 'todos' || client.kind === kind).length
  const rows = workspace.clients
    .filter((client) => filter === 'todos' || client.kind === filter)
    .filter((client) => matches(client, query))
    .map((client) => clientOverview(workspace, client, clock.today()))
    // Best real margin first; clients without works go last.
    .sort(
      (a, b) =>
        Number(b.works.length > 0) - Number(a.works.length > 0) ||
        b.margin - a.margin ||
        a.client.name.localeCompare(b.client.name, 'es'),
    )
  const withWorks = rows.filter((row) => row.works.length > 0)
  const best = withWorks[0]
  const belowTarget = withWorks.filter((row) => row.belowTarget)
  const overdueTotal = rows.reduce((sum, row) => sum + row.overdueTotal, 0)
  const overdueClients = rows.filter((row) => row.overdue.length > 0).length
  const options: FilterOption<KindFilter>[] = [
    { value: 'todos', label: 'Todos', count: count('todos') },
    ...kinds.map((kind) => ({ value: kind, label: clientKind[kind], count: count(kind) })),
  ]

  return (
    <>
      <PageTop
        title="Clientes"
        description="Sus datos, su IBAN, lo que han contratado y cómo rinden sus obras."
        actions={
          <Button onPress={() => setCreating(true)}>
            <Plus aria-hidden="true" className="size-4" /> Nuevo cliente
          </Button>
        }
      />
      {withWorks.length > 0 ? (
        <MetricGrid className="mb-5 grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Con quién más compensa"
            value={best?.client.name ?? '—'}
            description={
              best ? `${formatMoney(best.margin)} de margen · ${formatPercent(best.marginRate ?? 0)}` : ''
            }
            tone="success"
          />
          <MetricCard
            label="Por debajo de lo presupuestado"
            value={formatNumber(belowTarget.length)}
            description={
              belowTarget.length > 0
                ? belowTarget.map((row) => row.client.name).join(' · ')
                : 'Todos rinden como se presupuestó'
            }
            tone={belowTarget.length > 0 ? 'warning' : 'default'}
          />
          <MetricCard
            label="Cobros con más de 30 días"
            value={formatMoney(overdueTotal)}
            description={
              overdueClients > 0
                ? `${pluralize(overdueClients, 'cliente', 'clientes')} por reclamar`
                : 'Nada pendiente de reclamar'
            }
            tone={overdueClients > 0 ? 'warning' : 'default'}
          />
        </MetricGrid>
      ) : null}
      <FilterToolbar
        tabs={
          <FilterTabs label="Filtrar por tipo" options={options} value={filter} onChange={setFilter} />
        }
      >
        <SearchField
          label="Buscar clientes"
          value={query}
          onChange={setQuery}
          placeholder="Nombre, CIF, localidad o correo"
        />
      </FilterToolbar>
      <Panel aria-labelledby="clients-title">
        <PanelHeader
          id="clients-title"
          icon={<UserRound className="size-5" strokeWidth={1.75} />}
          title="Clientes"
          meta={formatNumber(rows.length)}
        />
        {rows.length === 0 ? (
          <EmptyPanel
            icon={<UserRound className="size-5" />}
            title="Ningún cliente coincide"
            description="Prueba con otra búsqueda o cambia el tipo."
          />
        ) : (
          <DataTable
            label="Clientes"
            rows={rows}
            getKey={(row) => row.client.id}
            openLabel={(row) => `Abrir ficha de ${row.client.name}`}
            onOpen={(row) => open(row.client.id)}
            columns={[
              {
                id: 'name',
                header: 'Cliente',
                cell: ({ client, overdue }) => (
                  <>
                    <span className="block truncate text-sm font-semibold">{client.name}</span>
                    <span className="text-muted-foreground flex items-center gap-2 truncate text-xs">
                      {clientKind[client.kind]} · {client.town}
                      {overdue.length > 0 ? <Tag tone="red">Cobro vencido</Tag> : null}
                    </span>
                  </>
                ),
              },
              {
                id: 'iban',
                header: 'IBAN',
                secondary: true,
                cell: ({ client }) =>
                  client.iban ? (
                    <span className="text-xs tabular-nums">{maskIban(client.iban)}</span>
                  ) : (
                    <Tag tone="amber">Sin IBAN</Tag>
                  ),
              },
              {
                id: 'contracted',
                header: 'Contratado',
                cell: ({ contracted, works }) => (
                  <>
                    <span className="block text-sm font-medium tabular-nums">
                      {formatMoney(contracted)}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {pluralize(works.length, 'obra', 'obras')}
                    </span>
                  </>
                ),
              },
              {
                id: 'yield',
                header: 'Margen real',
                cell: ({ margin, marginRate, belowTarget: below, yieldDeviation }) => (
                  <span className="flex flex-col items-start gap-1">
                    <span className="text-sm tabular-nums">
                      {marginRate === null
                        ? '—'
                        : `${formatMoney(margin)} · ${formatPercent(marginRate)}`}
                    </span>
                    {below ? <Tag tone="amber">Bajo lo presupuestado</Tag> : null}
                    <YieldDeviation value={yieldDeviation ?? 0} hasData={yieldDeviation !== null} />
                  </span>
                ),
              },
            ]}
            actions={({ client }) => (
              <RowMenu label={`Acciones de ${client.name}`}>
                <DropdownMenuItem onAction={() => open(client.id)}>Abrir ficha</DropdownMenuItem>
              </RowMenu>
            )}
          />
        )}
      </Panel>
      {creating ? (
        <ClientDialog onClose={() => setCreating(false)} onSaved={(client) => open(client.id)} />
      ) : null}
    </>
  )
}
