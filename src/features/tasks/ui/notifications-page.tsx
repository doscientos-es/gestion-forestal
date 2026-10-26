import { Button } from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { Bell, BellRing, CheckCheck } from 'lucide-react'

import { useCurrentUser, useWorkspace, type AppNotification } from '@/features/workspace'
import { formatShortDate } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader } from '@/shared/ui/surface'

import { tasksApi } from '../api'

export function NotificationsPage() {
  const workspace = useWorkspace()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const markRead = useCommand((ids?: string[]) => tasksApi.markRead(user?.id ?? '', ids))
  if (!user) return null
  const items = workspace.notifications
    .filter((item) => item.personId === user.id)
    .sort((a, b) => Number(a.read) - Number(b.read) || b.createdOn.localeCompare(a.createdOn))
  const unread = items.filter((item) => !item.read).length

  function open(item: AppNotification) {
    if (!item.read) markRead.mutate([item.id])
    if (item.kind.startsWith('gasto')) void navigate({ to: '/gastos' })
    else if (item.workId) void navigate({ to: '/obras/$workId', params: { workId: item.workId } })
    else if (item.kind.startsWith('ausencia')) void navigate({ to: '/ausencias' })
  }

  return (
    <>
      <PageTop
        title="Avisos"
        description="Obras que te asignan, tareas nuevas y respuestas a tus solicitudes."
        actions={
          <Button
            variant="outline"
            isDisabled={unread === 0}
            onPress={() => markRead.mutate(undefined)}
          >
            <CheckCheck aria-hidden="true" className="size-4" /> Marcar todo como leído
          </Button>
        }
      />
      <Panel aria-labelledby="notices-title">
        <PanelHeader
          id="notices-title"
          icon={<Bell className="size-5" strokeWidth={1.75} />}
          title="Bandeja"
          meta={unread > 0 ? `${unread} sin leer` : 'Al día'}
        />
        {items.length === 0 ? (
          <EmptyPanel
            icon={<BellRing className="size-5" />}
            title="No tienes avisos"
            description="Cuando la oficina te asigne una obra o una tarea, aparecerá aquí."
          />
        ) : (
          <ul className="divide-border divide-y">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => open(item)}
                  className="panel-row focus-visible:outline-ring flex w-full items-start gap-3 px-5 py-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read ? 'bg-transparent' : 'bg-brand'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${item.read ? '' : 'font-semibold'}`}>
                      {item.read ? null : <span className="sr-only">Sin leer: </span>}
                      {item.title}
                    </span>
                    <span className="text-muted-foreground block text-sm">{item.body}</span>
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {formatShortDate(item.createdOn)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
