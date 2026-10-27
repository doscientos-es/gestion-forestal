import { TreePine } from 'lucide-react'

import {
  invoiceTotals,
  lineAmount,
  lookup,
  type InvoiceDraft,
  type Workspace,
} from '@/features/workspace'
import { formatDate, formatMoney, formatNumber, formatPercent } from '@/shared/lib/format'

/** The draft laid out like an invoice, so the office reviews what the accounting office will issue. */
export function InvoiceDocument({
  invoice,
  workspace,
}: {
  invoice: InvoiceDraft
  workspace: Workspace
}) {
  const find = lookup(workspace)
  const client = find.client(invoice.clientId)
  const totals = invoiceTotals(invoice)

  return (
    <article
      aria-label={`Borrador de factura ${invoice.reference}`}
      className="print-invoice border-border w-full rounded-lg border bg-white p-6 text-sm text-zinc-900"
    >
      <header className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-5">
        <div className="flex items-center gap-3">
          <span className="bg-brand flex size-9 items-center justify-center rounded-md text-white">
            <TreePine aria-hidden="true" className="size-4" />
          </span>
          <div>
            <p className="font-semibold tracking-tight">Rodal</p>
            <p className="text-xs text-zinc-500">Servicios forestales</p>
          </div>
        </div>
        <div className="text-right">
          <p className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-amber-900 uppercase">
            Borrador
          </p>
          <p className="mt-1 font-semibold tabular-nums">{invoice.reference}</p>
          <p className="text-xs text-zinc-500">{formatDate(invoice.date)}</p>
        </div>
      </header>

      <section className="py-5">
        <p className="text-xs text-zinc-500">Cliente</p>
        <p className="font-semibold">{client?.name}</p>
        <p className="text-zinc-600">
          {client?.taxId} · {client?.town}
        </p>
        <p className="mt-3 text-xs text-zinc-500">Obra</p>
        <p className="font-medium">{find.work(invoice.workId)?.title}</p>
      </section>

      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
            <th scope="col" className="pb-2 font-medium">
              Concepto
            </th>
            <th scope="col" className="pb-2 text-right font-medium">
              Importe
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {invoice.lines.map((line) => (
            <tr key={line.description}>
              <td className="py-2.5 pr-3">
                {line.description}
                <span className="block text-xs text-zinc-500">
                  {formatNumber(line.quantity, 2)} {line.unit} × {formatMoney(line.unitPrice, true)}
                </span>
              </td>
              <td className="py-2.5 text-right tabular-nums">
                {formatMoney(lineAmount(line), true)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-zinc-200">
          <tr>
            <td className="pt-3 text-zinc-500">Base imponible</td>
            <td className="pt-3 text-right tabular-nums">{formatMoney(totals.base, true)}</td>
          </tr>
          <tr>
            <td className="text-zinc-500">IVA {formatPercent(invoice.vatRate)}</td>
            <td className="text-right tabular-nums">{formatMoney(totals.vat, true)}</td>
          </tr>
          <tr className="text-base font-semibold">
            <td className="pt-2">Total</td>
            <td className="pt-2 text-right tabular-nums">{formatMoney(totals.total, true)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-5 border-t border-zinc-200 pt-3 text-xs text-zinc-500">
        Borrador interno con IVA de ejemplo. Tipos, retenciones, numeración y sistema fiscal
        (TicketBAI u otro) los confirma la gestoría, que emite la factura oficial.
      </p>
    </article>
  )
}
