import { Eye, Mail, MessageSquareReply } from 'lucide-react'

import {
  budgetStatus,
  budgetTracking,
  eventDate,
  type Budget,
  type Workspace,
} from '@/features/workspace'
import { formatDateTime, formatShortDate, pluralize } from '@/shared/lib/format'
import { Panel, Stat } from '@/shared/ui/surface'

/** One-glance follow-up: was it sent, did the client open it, did they answer. */
export function BudgetTrackingStrip({
  budget,
  workspace,
}: {
  budget: Budget
  workspace: Workspace
}) {
  const tracking = budgetTracking(workspace.activity, budget.id)
  const answered = budget.status === 'aceptado' || budget.status === 'rechazado'
  const response = answered
    ? budget.status === 'aceptado'
      ? 'Aceptado por el cliente'
      : 'Rechazado por el cliente'
    : tracking.sentAt
      ? 'Sin respuesta todavía'
      : 'Aún no enviado'
  const cells = [
    {
      icon: Mail,
      label: 'Envío',
      value: tracking.sentAt ? formatShortDate(eventDate({ at: tracking.sentAt })) : 'Sin enviar',
      hint: tracking.sentAt
        ? `${tracking.sentTo}${tracking.sentCount > 1 ? ` · ${tracking.sentCount} envíos` : ''}`
        : 'Envíalo para empezar el seguimiento',
    },
    {
      icon: Eye,
      label: 'Aperturas del cliente',
      value: pluralize(tracking.views, 'vez', 'veces'),
      hint: tracking.lastViewAt
        ? `Última: ${formatDateTime(tracking.lastViewAt)}`
        : 'Nadie la ha abierto',
    },
    {
      icon: MessageSquareReply,
      label: 'Respuesta',
      value: budgetStatus[budget.status].label,
      hint: response,
    },
  ]
  return (
    <Panel aria-label="Seguimiento del presupuesto" className="mb-5">
      <div className="divide-border grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {cells.map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="flex items-start gap-3 px-5 py-4">
            <Icon aria-hidden="true" className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <Stat
                label={label}
                value={value}
                hint={<span className="block truncate">{hint}</span>}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}
