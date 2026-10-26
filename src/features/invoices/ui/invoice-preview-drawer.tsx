import {
  Button,
  DetailDrawer,
  DetailDrawerBody,
  DetailDrawerFooter,
  DetailDrawerHeader,
  DrawerDescription,
  DrawerTitle,
} from '@doscientos/ui'
import { Download, Mail, Printer } from 'lucide-react'

import {
  accountingLookup,
  invoiceStatus,
  invoiceTotals,
  invoicesToCsv,
  lineAmount,
  lookup,
  type InvoiceDraft,
  type Workspace,
} from '@/features/workspace'
import { downloadTextFile } from '@/shared/lib/download'
import { formatDate, formatMoney, formatNumber, formatPercent } from '@/shared/lib/format'
import { Tag } from '@/shared/ui/surface'

export function InvoicePreviewDrawer({
  invoice,
  workspace,
  onOpenChange,
  onHandOver,
  onMarkPaid,
}: {
  invoice: InvoiceDraft | null
  workspace: Workspace
  onOpenChange: (open: boolean) => void
  onHandOver: (invoice: InvoiceDraft) => void
  onMarkPaid: (invoice: InvoiceDraft) => void
}) {
  const find = lookup(workspace)
  const client = invoice ? find.client(invoice.clientId) : undefined
  const totals = invoice ? invoiceTotals(invoice) : null
  return (
    <DetailDrawer isOpen={Boolean(invoice)} onOpenChange={onOpenChange}>
      {invoice && totals ? (
        <>
          <DetailDrawerHeader>
            <DrawerTitle>Borrador {invoice.reference}</DrawerTitle>
            <DrawerDescription>
              Documento interno. La factura fiscal la emite la gestoría.
            </DrawerDescription>
          </DetailDrawerHeader>
          <DetailDrawerBody className="print-invoice space-y-5">
            <p className="hidden text-xl font-semibold print:block">
              Borrador de factura {invoice.reference}
            </p>
            <div className="flex items-center justify-between">
              <Tag tone={invoiceStatus[invoice.status].tone} dot>
                {invoiceStatus[invoice.status].label}
              </Tag>
              <span className="text-muted-foreground text-sm">{formatDate(invoice.date)}</span>
            </div>
            <div className="border-border rounded-lg border p-4 text-sm">
              <p className="text-muted-foreground text-xs">Cliente</p>
              <p className="font-semibold">{client?.name}</p>
              <p className="text-muted-foreground">
                {client?.taxId} · {client?.town}
              </p>
              <p className="text-muted-foreground mt-3 text-xs">Obra</p>
              <p className="font-medium">{find.work(invoice.workId)?.title}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-xs">
                  <th scope="col" className="pb-2 font-medium">
                    Concepto
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {invoice.lines.map((line) => (
                  <tr key={line.description}>
                    <td className="py-2 pr-3">
                      {line.description}
                      <span className="text-muted-foreground block text-xs">
                        {formatNumber(line.quantity, 2)} {line.unit} ×{' '}
                        {formatMoney(line.unitPrice, true)}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(lineAmount(line), true)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-border border-t">
                <tr>
                  <td className="text-muted-foreground pt-3">Base imponible</td>
                  <td className="pt-3 text-right tabular-nums">{formatMoney(totals.base, true)}</td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">IVA {formatPercent(invoice.vatRate)}</td>
                  <td className="text-right tabular-nums">{formatMoney(totals.vat, true)}</td>
                </tr>
                <tr className="text-base font-semibold">
                  <td className="pt-2">Total</td>
                  <td className="pt-2 text-right tabular-nums">
                    {formatMoney(totals.total, true)}
                  </td>
                </tr>
              </tfoot>
            </table>
            <p className="text-muted-foreground bg-muted rounded-lg px-4 py-3 text-xs">
              IVA de ejemplo. Tipos, retenciones, numeración y sistema fiscal (TicketBAI u otro) los
              confirma la gestoría.
            </p>
          </DetailDrawerBody>
          <DetailDrawerFooter className="flex-wrap justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onPress={() =>
                  downloadTextFile(
                    `${invoice.reference}.csv`,
                    invoicesToCsv([invoice], accountingLookup(workspace)),
                  )
                }
              >
                <Download aria-hidden="true" className="size-4" /> Descargar
              </Button>
              <Button variant="outline" onPress={() => window.print()}>
                <Printer aria-hidden="true" className="size-4" /> Imprimir
              </Button>
              <Button
                variant="outline"
                onPress={() => {
                  const subject = `Borrador de factura ${invoice.reference}`
                  const body = `Hola,\n\nTe adjunto el borrador ${invoice.reference} de «${find.work(invoice.workId)?.title ?? ''}» por ${formatMoney(totals.total, true)} (IVA incluido).\n\nUn saludo`
                  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                }}
              >
                <Mail aria-hidden="true" className="size-4" /> Enviar por email
              </Button>
            </div>
            {invoice.status === 'borrador' ? (
              <Button onPress={() => onHandOver(invoice)}>Enviar a gestoría</Button>
            ) : null}
            {invoice.status === 'enviada' ? (
              <Button onPress={() => onMarkPaid(invoice)}>Marcar como cobrada</Button>
            ) : null}
          </DetailDrawerFooter>
        </>
      ) : null}
    </DetailDrawer>
  )
}
