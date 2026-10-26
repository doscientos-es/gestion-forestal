import type { Cents, InvoiceDraft, InvoiceLine, Work } from './model'
import type { WorkPerformance } from './work-performance'

export const DEFAULT_VAT_RATE = 0.21

export function lineAmount(line: InvoiceLine): Cents {
  return Math.round(line.quantity * line.unitPrice)
}

export function invoiceTotals(invoice: Pick<InvoiceDraft, 'lines' | 'vatRate'>) {
  const base = invoice.lines.reduce((sum, line) => sum + lineAmount(line), 0)
  const vat = Math.round(base * invoice.vatRate)
  return { base, vat, total: base + vat }
}

export function invoicedProgress(workId: string, invoices: InvoiceDraft[]) {
  return invoices
    .filter((invoice) => invoice.workId === workId)
    .reduce((max, invoice) => Math.max(max, invoice.progressTo), 0)
}

export function invoicedBase(workId: string, invoices: InvoiceDraft[]) {
  return invoices
    .filter((invoice) => invoice.workId === workId)
    .reduce((sum, invoice) => sum + invoiceTotals(invoice).base, 0)
}

export type DraftProposal = {
  kind: InvoiceDraft['kind']
  progressFrom: number
  progressTo: number
  lines: InvoiceLine[]
} | null

/**
 * Proposes the next draft for a work: progress billing while in progress,
 * remaining balance when finished. Never bills more than the budgeted price.
 */
export function proposeDraft(
  work: Work,
  performance: WorkPerformance,
  invoices: InvoiceDraft[],
): DraftProposal {
  const finished = work.status === 'terminada' || work.status === 'facturada'
  const progressFrom = invoicedProgress(work.id, invoices)
  const progressTo = finished ? 1 : Math.min(1, Math.floor(performance.progress * 100) / 100)
  const remaining = work.planned.price - invoicedBase(work.id, invoices)
  if (progressTo <= progressFrom || remaining <= 0) return null
  const amount = finished
    ? remaining
    : Math.min(remaining, Math.round(work.planned.price * (progressTo - progressFrom)))
  const percent = (value: number) => `${Math.round(value * 100)} %`
  const description = finished
    ? `Liquidación final · ${work.title}`
    : `Certificación de avance ${percent(progressFrom)} → ${percent(progressTo)} · ${work.title}`
  return {
    kind: finished ? 'final' : 'avance',
    progressFrom,
    progressTo,
    lines: [{ description, quantity: 1, unit: 'ud', unitPrice: amount }],
  }
}

export function nextInvoiceReference(year: number, invoices: InvoiceDraft[]) {
  const prefix = `BOR-${year}-`
  const max = invoices
    .filter((invoice) => invoice.reference.startsWith(prefix))
    .reduce(
      (highest, invoice) => Math.max(highest, Number(invoice.reference.slice(prefix.length))),
      0,
    )
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

/** CSV for the accounting office (semicolon separated, Spanish decimals). */
export function invoicesToCsv(
  invoices: InvoiceDraft[],
  resolve: {
    client: (id: string) => { name: string; taxId: string }
    work: (id: string) => string
  },
) {
  const decimal = (cents: Cents) => (cents / 100).toFixed(2).replace('.', ',')
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
  const header = [
    'Referencia',
    'Fecha',
    'Cliente',
    'NIF',
    'Obra',
    'Concepto',
    'Base',
    'IVA',
    'Total',
    'Estado',
  ]
  const rows = invoices.map((invoice) => {
    const totals = invoiceTotals(invoice)
    const client = resolve.client(invoice.clientId)
    return [
      invoice.reference,
      invoice.date,
      quote(client.name),
      client.taxId,
      quote(resolve.work(invoice.workId)),
      quote(invoice.lines.map((line) => line.description).join(' | ')),
      decimal(totals.base),
      decimal(totals.vat),
      decimal(totals.total),
      invoice.status,
    ].join(';')
  })
  return [header.join(';'), ...rows].join('\n')
}
