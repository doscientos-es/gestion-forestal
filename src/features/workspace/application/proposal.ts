import { formatMoney, formatNumber } from '@/shared/lib/format'

import { estimateStoredBudget } from './budget-calculation'
import type { Budget, Cents, Client, Species } from './model'

export type ProposalLine = { title: string; detail: string; amount: Cents }

const WHOLE_EURO: Cents = 100

/**
 * What the client sees: one amount per line, never the internal cost or margin. The sale price
 * is shared out in proportion to what each line costs us, and the last line absorbs rounding so
 * the lines always add up to the budget price.
 */
export function proposalLines(budget: Budget, species: Species[]): ProposalLine[] {
  const estimate = estimateStoredBudget(budget, species)
  const rawWorkerDays = estimate.lines.reduce((sum, line) => sum + line.workerDays, 0)
  const indirect = estimate.laborCost + estimate.travelCost
  const costs = estimate.lines.map((line) => {
    const share = rawWorkerDays > 0 ? line.workerDays / rawWorkerDays : 1 / estimate.lines.length
    return line.materialCost + indirect * share
  })
  const totalCost = costs.reduce((sum, cost) => sum + cost, 0)
  let assigned: Cents = 0
  return budget.lines.map((line, index) => {
    const last = index === budget.lines.length - 1
    const share = totalCost > 0 ? (costs[index] ?? 0) / totalCost : 0
    const amount = last
      ? estimate.price - assigned
      : Math.round((estimate.price * share) / WHOLE_EURO) * WHOLE_EURO
    assigned += amount
    const item = estimate.lines[index]
    return line.kind === 'plantacion'
      ? {
          title: `Plantación de ${species.find((s) => s.id === line.speciesId)?.name ?? 'especie'}`,
          detail: `${formatNumber(line.hectares, 2)} ha · ${formatNumber(item?.plants ?? 0)} plantas (${formatNumber(line.density)} pl/ha)`,
          amount,
        }
      : {
          title: line.description,
          detail: `${formatNumber(line.hectares, 2)} ha`,
          amount,
        }
  })
}

export type EmailDraft = { to: string; subject: string; message: string }

/** Starting text of the email that carries a proposal; the office can edit it before sending. */
export function budgetEmailDraft(
  budget: Budget,
  client: Client | undefined,
  price: Cents,
  link: string,
): EmailDraft {
  return {
    to: client?.email ?? '',
    subject: `Propuesta ${budget.number} · ${budget.title}`,
    message: [
      `Buenos días${client ? `, ${client.name}` : ''}:`,
      '',
      `Les enviamos la propuesta «${budget.title}» por ${formatMoney(price)} + IVA.`,
      `Pueden consultarla aquí: ${link}`,
      '',
      'Quedamos a su disposición para cualquier duda.',
      'Un saludo.',
    ].join('\n'),
  }
}

export function invoiceEmailDraft(
  reference: string,
  workTitle: string,
  client: Client | undefined,
  total: Cents,
): EmailDraft {
  return {
    to: client?.email ?? '',
    subject: `Borrador de factura ${reference}`,
    message: [
      `Buenos días${client ? `, ${client.name}` : ''}:`,
      '',
      `Les adjuntamos el borrador ${reference} de «${workTitle}» por ${formatMoney(total, true)} (IVA incluido).`,
      'La factura oficial se emite desde la gestoría.',
      '',
      'Un saludo.',
    ].join('\n'),
  }
}
