import {
  apiDeps,
  invoicesToCsv,
  accountingLookup,
  missingClientBillingFields,
  mutate,
  sendInvoiceEmail,
  setInvoiceStatus,
  type ApiDeps,
  type EmailInput,
} from '@/features/workspace'
import { DomainError } from '@/shared/lib/errors'

export type AccountingExport = { filename: string; csv: string }

export type InvoicesApi = {
  /** Builds the CSV for the accounting office and marks the drafts as handed over. */
  sendToAccounting(invoiceIds: string[]): Promise<AccountingExport>
  markPaid(invoiceIds: string[]): Promise<void>
  /** Simulated: records that a copy of the draft was emailed. No email leaves the app. */
  sendEmail(invoiceId: string, email: EmailInput): Promise<void>
}

export function createInvoicesApi(deps: ApiDeps): InvoicesApi {
  return {
    async sendToAccounting(invoiceIds) {
      return mutate(deps, (workspace, context) => {
        const lookup = accountingLookup(workspace)
        const selected = workspace.invoices.filter((invoice) => invoiceIds.includes(invoice.id))
        for (const invoice of selected) {
          const client = workspace.clients.find((item) => item.id === invoice.clientId)
          if (!client) throw new DomainError('No se encuentra el cliente de la factura.')
          const missing = missingClientBillingFields(client)
          if (missing.length > 0)
            throw new DomainError(
              `Completa los datos de facturación de ${client.name}: ${missing.join(', ')}.`,
            )
        }
        return {
          workspace: setInvoiceStatus(
            workspace,
            selected
              .filter((invoice) => invoice.status === 'borrador')
              .map((invoice) => invoice.id),
            'enviada',
            context,
          ),
          result: {
            filename: `facturas-gestoria-${context.today}.csv`,
            csv: invoicesToCsv(selected, lookup),
          },
        }
      })
    },
    markPaid: (invoiceIds) =>
      mutate(deps, (workspace, context) => ({
        workspace: setInvoiceStatus(workspace, invoiceIds, 'cobrada', context),
        result: undefined,
      })),
    sendEmail: (invoiceId, email) =>
      mutate(deps, (workspace, context) => ({
        workspace: sendInvoiceEmail(workspace, invoiceId, email, context),
        result: undefined,
      })),
  }
}

export const invoicesApi = createInvoicesApi(apiDeps)
