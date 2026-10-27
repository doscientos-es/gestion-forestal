import {
  Banknote,
  Check,
  Eye,
  FilePlus2,
  FileUp,
  Landmark,
  Mail,
  X,
  type LucideIcon,
} from 'lucide-react'

import {
  activityKind,
  type ActivityEvent,
  type ActivityKind,
  type Workspace,
} from '@/features/workspace'
import { formatDateTime } from '@/shared/lib/format'

const icons: Record<ActivityKind, LucideIcon> = {
  presupuesto_creado: FilePlus2,
  presupuesto_importado: FileUp,
  presupuesto_enviado: Mail,
  presupuesto_visto: Eye,
  presupuesto_aceptado: Check,
  presupuesto_rechazado: X,
  factura_creada: FilePlus2,
  factura_enviada_cliente: Mail,
  factura_enviada_gestoria: Landmark,
  factura_cobrada: Banknote,
}

/** Who did it: the signed-in person, or the client when nobody from the office did. */
export function actorName(workspace: Workspace, event: ActivityEvent) {
  if (event.actorId) return workspace.people.find((p) => p.id === event.actorId)?.name ?? 'Equipo'
  return event.kind === 'presupuesto_visto' ? 'Cliente' : 'Sistema'
}

export function ActivityIcon({ kind }: { kind: ActivityKind }) {
  const Icon = icons[kind]
  return (
    <span
      aria-hidden="true"
      className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full"
    >
      <Icon className="size-3.5" />
    </span>
  )
}

/** Newest-first history of one document: what happened, who did it and when. */
export function ActivityTimeline({
  events,
  workspace,
  limit = 8,
}: {
  events: ActivityEvent[]
  workspace: Workspace
  limit?: number
}) {
  return (
    <ol className="divide-border divide-y">
      {events.slice(0, limit).map((event) => (
        <li key={event.id} className="flex items-start gap-3 px-5 py-3">
          <ActivityIcon kind={event.kind} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{activityKind[event.kind].label}</p>
            <p className="text-muted-foreground truncate text-xs">
              {actorName(workspace, event)} · {event.summary}
            </p>
          </div>
          <time dateTime={event.at} className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {formatDateTime(event.at)}
          </time>
        </li>
      ))}
    </ol>
  )
}
