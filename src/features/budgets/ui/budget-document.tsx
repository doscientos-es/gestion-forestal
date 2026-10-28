import { TreePine } from 'lucide-react'

import {
  DEFAULT_VAT_RATE,
  estimateStoredBudget,
  lookup,
  proposalLines,
  type Budget,
  type Workspace,
} from '@/features/workspace'
import { company } from '@/shared/lib/company'
import { formatDate, formatMoney, formatPercent } from '@/shared/lib/format'

/**
 * The proposal exactly as the client receives it: amounts per line, VAT and total. Internal cost,
 * margin and yields never appear here. Also used for the preview and for printing to PDF.
 */
export function BudgetDocument({ budget, workspace }: { budget: Budget; workspace: Workspace }) {
  const find = lookup(workspace)
  const client = find.client(budget.clientId)
  const lines = proposalLines(budget, workspace.species)
  const { price, crewDays } = estimateStoredBudget(budget, workspace.species)
  const vat = Math.round(price * DEFAULT_VAT_RATE)

  return (
    <article
      aria-label={`Propuesta ${budget.number}`}
      className="print-invoice border-border mx-auto w-full max-w-3xl rounded-lg border bg-white p-6 text-sm text-zinc-900 sm:p-10"
    >
      <header className="flex items-start justify-between gap-6 border-b border-zinc-200 pb-6">
        <div className="flex items-center gap-3">
          <span className="bg-brand flex size-10 items-center justify-center rounded-md text-white">
            <TreePine aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight">{company.name}</p>
            <p className="text-xs text-zinc-500">{company.tagline}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs tracking-wide text-zinc-500 uppercase">Propuesta</p>
          <p className="text-lg font-semibold tabular-nums">{budget.number}</p>
          <p className="text-xs text-zinc-500">{formatDate(budget.date)}</p>
        </div>
      </header>

      <section className="grid gap-6 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs text-zinc-500">Para</p>
          <p className="font-semibold">{client?.name}</p>
          <p className="text-zinc-600">
            {client?.taxId} · {client?.town}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Trabajo</p>
          <p className="font-semibold">{budget.title}</p>
          <p className="text-zinc-600">
            {find.zone(budget.zoneId)?.name} · {crewDays} días de cuadrilla
          </p>
        </div>
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
          {lines.map((line) => (
            <tr key={`${line.title}-${line.detail}`}>
              <td className="py-3 pr-4">
                <span className="block font-medium">{line.title}</span>
                <span className="block text-xs text-zinc-500">{line.detail}</span>
              </td>
              <td className="py-3 text-right tabular-nums">{formatMoney(line.amount, true)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-zinc-200">
          <tr>
            <td className="pt-3 text-zinc-500">Base imponible</td>
            <td className="pt-3 text-right tabular-nums">{formatMoney(price, true)}</td>
          </tr>
          <tr>
            <td className="text-zinc-500">IVA {formatPercent(DEFAULT_VAT_RATE)}</td>
            <td className="text-right tabular-nums">{formatMoney(vat, true)}</td>
          </tr>
          <tr className="text-base font-semibold">
            <td className="pt-2">Total</td>
            <td className="pt-2 text-right tabular-nums">{formatMoney(price + vat, true)}</td>
          </tr>
        </tfoot>
      </table>

      {budget.notes ? <p className="mt-6 text-zinc-600">{budget.notes}</p> : null}
      <p className="mt-8 border-t border-zinc-200 pt-4 text-xs text-zinc-500">
        Propuesta válida durante 30 días desde su fecha.
      </p>
    </article>
  )
}
