import {
  apiDeps,
  commandContext,
  invoicesToCsv,
  accountingLookup,
  mutate,
  setInvoiceStatus,
  type ApiDeps,
} from '@/features/workspace'

export type AccountingExport = { filename: string; csv: string }

export type InvoicesApi = {
  /** Builds the CSV for the accounting office and marks the drafts as handed over. */
  sendToAccounting(invoiceIds: string[]): Promise<AccountingExport>
  markPaid(invoiceIds: string[]): Promise<void>
}

export function createInvoicesApi(deps: ApiDeps): InvoicesApi {
  return {
    async sendToAccounting(invoiceIds) {
      return mutate(deps, (workspace) => {
        const lookup = accountingLookup(workspace)
        const selected = workspace.invoices.filter((invoice) => invoiceIds.includes(invoice.id))
        const context = commandContext(deps)
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
      mutate(deps, (workspace) => ({
        workspace: setInvoiceStatus(workspace, invoiceIds, 'cobrada', commandContext(deps)),
        result: undefined,
      })),
  }
}

export const invoicesApi = createInvoicesApi(apiDeps)
