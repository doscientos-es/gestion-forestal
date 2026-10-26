import { Button, DropdownMenuItem, MetricCard, MetricGrid, SelectionToolbar } from '@doscientos/ui'
import { Banknote, Download, Receipt } from 'lucide-react'
import { useState } from 'react'

import {
  invoiceStatus,
  invoiceTotals,
  lookup,
  useWorkspace,
  type InvoiceDraft,
  type InvoiceStatus,
} from '@/features/workspace'
import { downloadTextFile } from '@/shared/lib/download'
import { formatMoney, formatShortDate } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { DataTable, RowMenu } from '@/shared/ui/data-table'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { FilterTabs } from '@/shared/ui/filter-tabs'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

import { invoicesApi } from '../api'
import { InvoicePreviewDrawer } from './invoice-preview-drawer'

type Filter = 'todas' | InvoiceStatus

export function InvoicesPage() {
  const workspace = useWorkspace()
  const [filter, setFilter] = useState<Filter>('todas')
  const [selected, setSelected] = useState<string[]>([])
  const [preview, setPreview] = useState<InvoiceDraft | null>(null)
  const find = lookup(workspace)
  const rows = workspace.invoices.filter((item) => filter === 'todas' || item.status === filter)
  const count = (value: Filter) =>
    workspace.invoices.filter((item) => value === 'todas' || item.status === value).length
  const sum = (status: InvoiceStatus) =>
    workspace.invoices
      .filter((item) => item.status === status)
      .reduce((acc, item) => acc + invoiceTotals(item).total, 0)
  const chosen = workspace.invoices.filter((item) => selected.includes(item.id))
  const drafts = workspace.invoices.filter((item) => item.status === 'borrador')
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  const handOver = useCommand(
    (list: InvoiceDraft[]) => invoicesApi.sendToAccounting(list.map((item) => item.id)),
    {
      success: (_output, list) => ({
        title: 'Enviado a la gestoría',
        description: `${list.length} facturas · CSV descargado`,
      }),
      onSuccess: (file) => {
        downloadTextFile(file.filename, file.csv)
        setSelected([])
      },
    },
  )
  const markPaid = useCommand((ids: string[]) => invoicesApi.markPaid(ids), {
    success: (_output, ids) => ({
      title: 'Marcadas como cobradas',
      description: `${ids.length} facturas`,
    }),
    onSuccess: () => setSelected([]),
  })

  return (
    <>
      <PageTop
        title="Facturas"
        description="Borradores generados desde las obras. La gestoría emite la factura oficial."
        actions={
          <Button
            isDisabled={drafts.length === 0 || handOver.isPending}
            onPress={() => handOver.mutate(drafts)}
          >
            <Download aria-hidden="true" className="size-4" /> Enviar borradores a gestoría
          </Button>
        }
      />
      <MetricGrid className="mb-5 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Borradores por revisar"
          value={formatMoney(sum('borrador'))}
          description={`${count('borrador')} facturas`}
        />
        <MetricCard
          label="En gestoría, pendiente de cobro"
          value={formatMoney(sum('enviada'))}
          description={`${count('enviada')} facturas`}
          tone="warning"
        />
        <MetricCard
          label="Cobrado"
          value={formatMoney(sum('cobrada'))}
          description={`${count('cobrada')} facturas`}
          tone="success"
        />
      </MetricGrid>
      <div className="mb-4">
        <FilterTabs
          label="Filtrar facturas"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'todas', label: 'Todas', count: count('todas') },
            { value: 'borrador', label: 'Borradores', count: count('borrador') },
            { value: 'enviada', label: 'En gestoría', count: count('enviada') },
            { value: 'cobrada', label: 'Cobradas', count: count('cobrada') },
          ]}
        />
      </div>
      {chosen.length > 0 ? (
        <SelectionToolbar
          count={chosen.length}
          className="panel mb-3 flex items-center gap-2 px-4 py-2"
        >
          <Button size="sm" variant="outline" onPress={() => handOver.mutate(chosen)}>
            <Download aria-hidden="true" className="size-4" /> Exportar a gestoría
          </Button>
          <Button size="sm" onPress={() => markPaid.mutate(chosen.map((item) => item.id))}>
            <Banknote aria-hidden="true" className="size-4" /> Marcar cobradas
          </Button>
        </SelectionToolbar>
      ) : null}
      <Panel aria-labelledby="invoices-title">
        <PanelHeader
          id="invoices-title"
          icon={<Receipt className="size-5" strokeWidth={1.75} />}
          title="Borradores y facturas"
          meta={rows.length}
        />
        {rows.length === 0 ? (
          <EmptyPanel
            icon={<Receipt className="size-5" />}
            title="No hay facturas en esta vista"
            description="Genera un borrador desde una obra en curso o terminada."
          />
        ) : (
          <DataTable
            label="Facturas"
            rows={rows}
            getKey={(invoice) => invoice.id}
            openLabel={(invoice) => `Ver borrador ${invoice.reference}`}
            onOpen={setPreview}
            select={{ selected, onToggle: toggle }}
            columns={[
              {
                id: 'client',
                header: 'Factura',
                cell: (invoice) => (
                  <>
                    <span className="block truncate text-sm font-semibold">
                      {find.client(invoice.clientId)?.name}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {invoice.reference} · {invoice.kind === 'avance' ? 'Avance' : 'Liquidación'} ·{' '}
                      {find.work(invoice.workId)?.title}
                    </span>
                  </>
                ),
              },
              {
                id: 'status',
                header: 'Estado',
                secondary: true,
                cell: (invoice) => {
                  const status = invoiceStatus[invoice.status]
                  return (
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  )
                },
              },
              {
                id: 'date',
                header: 'Fecha',
                secondary: true,
                className: 'text-muted-foreground text-sm',
                cell: (invoice) => formatShortDate(invoice.date),
              },
              {
                id: 'total',
                header: 'Total con IVA',
                align: 'right',
                className: 'font-semibold tabular-nums',
                cell: (invoice) => formatMoney(invoiceTotals(invoice).total),
              },
            ]}
            actions={(invoice) => (
              <RowMenu label={`Acciones de ${invoice.reference}`}>
                <DropdownMenuItem onAction={() => setPreview(invoice)}>
                  Ver borrador
                </DropdownMenuItem>
                {invoice.status === 'borrador' ? (
                  <DropdownMenuItem onAction={() => handOver.mutate([invoice])}>
                    Enviar a gestoría
                  </DropdownMenuItem>
                ) : null}
                {invoice.status !== 'cobrada' ? (
                  <DropdownMenuItem onAction={() => markPaid.mutate([invoice.id])}>
                    Marcar como cobrada
                  </DropdownMenuItem>
                ) : null}
              </RowMenu>
            )}
          />
        )}
      </Panel>
      <InvoicePreviewDrawer
        invoice={workspace.invoices.find((item) => item.id === preview?.id) ?? null}
        workspace={workspace}
        onOpenChange={(open) => !open && setPreview(null)}
        onHandOver={(invoice) => handOver.mutate([invoice])}
        onMarkPaid={(invoice) => markPaid.mutate([invoice.id])}
      />
    </>
  )
}
