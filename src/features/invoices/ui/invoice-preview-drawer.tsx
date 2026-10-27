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
import { useState } from 'react'

import { ActivityTimeline } from '@/features/activity'
import {
  accountingLookup,
  activityFor,
  invoiceEmailDraft,
  invoiceStatus,
  invoiceTotals,
  invoicesToCsv,
  lookup,
  type InvoiceDraft,
  type Workspace,
} from '@/features/workspace'
import { downloadTextFile } from '@/shared/lib/download'
import { formatDate, formatMoney } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { SendEmailDialog } from '@/shared/ui/send-email-dialog'
import { Tag } from '@/shared/ui/surface'

import { invoicesApi } from '../api'
import { InvoiceDocument } from './invoice-document'

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
  const [emailing, setEmailing] = useState(false)
  const totals = invoice ? invoiceTotals(invoice) : null
  const history = invoice ? activityFor(workspace.activity, 'invoice', invoice.id) : []
  const send = useCommand(
    (email: { to: string; subject: string; message: string }) =>
      invoicesApi.sendEmail(invoice?.id ?? '', email),
    {
      success: (_output, email) => ({
        title: 'Copia enviada (simulado)',
        description: `Anotado en el historial · ${email.to}`,
      }),
      onSuccess: () => setEmailing(false),
    },
  )
  return (
    <DetailDrawer isOpen={Boolean(invoice)} onOpenChange={onOpenChange}>
      {invoice && totals ? (
        <>
          <DetailDrawerHeader>
            <DrawerTitle>Borrador {invoice.reference}</DrawerTitle>
            <DrawerDescription>
              <span className="flex items-center gap-2">
                <Tag tone={invoiceStatus[invoice.status].tone} dot>
                  {invoiceStatus[invoice.status].label}
                </Tag>
                {formatDate(invoice.date)} · {formatMoney(totals.total, true)} con IVA
              </span>
            </DrawerDescription>
          </DetailDrawerHeader>
          <DetailDrawerBody className="space-y-5">
            <InvoiceDocument invoice={invoice} workspace={workspace} />
            <section aria-labelledby="invoice-history" className="border-border rounded-lg border">
              <h3
                id="invoice-history"
                className="border-border border-b px-5 py-3 text-sm font-semibold"
              >
                Historial
              </h3>
              {history.length === 0 ? (
                <p className="text-muted-foreground px-5 py-4 text-sm">Todavía sin movimientos.</p>
              ) : (
                <ActivityTimeline events={history} workspace={workspace} />
              )}
            </section>
            <SendEmailDialog
              open={emailing}
              onOpenChange={setEmailing}
              title="Enviar copia del borrador"
              description={`${invoice.reference} · ${find.client(invoice.clientId)?.name ?? ''}`}
              initial={invoiceEmailDraft(
                invoice.reference,
                find.work(invoice.workId)?.title ?? '',
                find.client(invoice.clientId),
                totals.total,
              )}
              attachment={`${invoice.reference}.pdf · borrador`}
              pending={send.isPending}
              confirmLabel="Enviar copia"
              onSend={(email) => send.mutate(email)}
            />
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
              <Button variant="outline" onPress={() => setEmailing(true)}>
                <Mail aria-hidden="true" className="size-4" /> Enviar copia
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
