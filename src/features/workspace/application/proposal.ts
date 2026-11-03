import { formatMoney, formatNumber } from '@/shared/lib/format'

import { estimateStoredBudget } from './budget-calculation'
import type { Budget, Cents, Client, Species } from './model'

export type ProposalLine = { title: string; detail: string; amount: Cents }

const WHOLE_EURO: Cents = 100

/**
 * What the client sees: one amount per line, never the internal cost or margin. The sale price
 * of forestry lines is shared out in proportion to their costs; the last forestry line absorbs
 * rounding. Free-form lines retain their explicit sale price, regardless of their internal cost.
 */
export function proposalLines(budget: Budget, species: Species[]): ProposalLine[] {
  const estimate = estimateStoredBudget(budget, species)
  const rawWorkerDays = estimate.lines.reduce((sum, line) => sum + line.workerDays, 0)
  const indirect = estimate.laborCost + estimate.travelCost
  const operationalLines = budget.lines.filter((line) => line.kind !== 'libre')
  const lastOperationalId = operationalLines.at(-1)?.id
  const operationalPrice = estimate.price - estimate.fixedPrice
  const costs = estimate.lines.map((line) => {
    const share = rawWorkerDays > 0 ? line.workerDays / rawWorkerDays : 0
    return line.materialCost + indirect * share
  })
  const totalCost = costs.reduce((sum, cost) => sum + cost, 0)
  let assigned: Cents = 0
  return budget.lines.map((line, index) => {
    if (line.kind === 'libre')
      return {
        title: line.description,
        detail: `${formatNumber(line.quantity, 2)} ${line.unit} × ${formatMoney(line.unitPrice, true)}`,
        amount: estimate.lines[index]?.fixedPrice ?? 0,
      }
    const last = line.id === lastOperationalId
    const share = totalCost > 0 ? (costs[index] ?? 0) / totalCost : 0
    const amount = last
      ? operationalPrice - assigned
      : Math.min(
          operationalPrice - assigned,
          Math.round((operationalPrice * share) / WHOLE_EURO) * WHOLE_EURO,
        )
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
      `Les enviamos la propuesta «${budget.title}» por ${formatMoney(price, true)} + IVA.`,
      `Pueden consultarla aquí: ${link}`,
      '',
      'Quedamos a su disposición para cualquier duda.',
      'Un saludo.',
    ].join('\n'),
  }
}

export function workReportEmailDraft(
  workTitle: string,
  client: Client | undefined,
  progress: number,
  link: string,
): EmailDraft {
  return {
    to: client?.email ?? '',
    subject: `Informe de avance · ${workTitle}`,
    message: [
      `Buenos días${client ? `, ${client.name}` : ''}:`,
      '',
      `La obra «${workTitle}» lleva un ${Math.round(progress * 100)} % de avance.`,
      `Pueden ver el informe con fotos aquí: ${link}`,
      '',
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
