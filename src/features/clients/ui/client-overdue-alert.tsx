import { Alert, AlertDescription, AlertTitle } from '@doscientos/ui'
import { Link } from '@tanstack/react-router'
import { Banknote } from 'lucide-react'

import { OVERDUE_DAYS, type OverdueInvoice } from '@/features/workspace'
import { formatDate, formatMoney, pluralize } from '@/shared/lib/format'

/** Invoices the client has not paid after `OVERDUE_DAYS`: the first thing the office should chase. */
export function ClientOverdueAlert({ overdue, total }: { overdue: OverdueInvoice[]; total: number }) {
  if (overdue.length === 0) return null
  return (
    <Alert variant="destructive" className="mb-5">
      <Banknote aria-hidden="true" className="size-4" />
      <AlertTitle>
        {pluralize(overdue.length, 'factura', 'facturas')} sin cobrar tras más de {OVERDUE_DAYS}{' '}
        días · {formatMoney(total, true)}
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-1 space-y-0.5">
          {overdue.map(({ invoice, total: amount, days }) => (
            <li key={invoice.id} className="tabular-nums">
              <Link to="/facturas" className="font-medium underline-offset-2 hover:underline">
                {invoice.reference}
              </Link>{' '}
              · enviada el {formatDate(invoice.sentOn ?? invoice.date)} · {days} días ·{' '}
              {formatMoney(amount, true)} con IVA
            </li>
          ))}
        </ul>
        <p className="mt-2">Conviene llamar o escribir al cliente antes de que se alargue más.</p>
      </AlertDescription>
    </Alert>
  )
}
