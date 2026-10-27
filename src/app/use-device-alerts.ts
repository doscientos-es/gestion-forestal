import { toast } from '@doscientos/ui'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import {
  freshNotices,
  notificationTarget,
  notificationUrl,
  useWorkspace,
  type AppNotification,
  type Person,
} from '@/features/workspace'
import { browserStorage, readJson, STORAGE_PREFIX, writeJson } from '@/shared/lib/local-storage'
import { registerServiceWorker, setBadge, showSystemAlert } from '@/shared/lib/pwa'

const seenKey = (personId: string) => `alerts-seen:${personId}`
const DB_PREFIX = `${STORAGE_PREFIX}db:`

/**
 * Turns new notices into something the person notices: a system alert when the app is in the
 * background, an in-app toast when it is in front, and the number on the app icon. Also keeps
 * several tabs in sync (the demo database lives in localStorage, which tabs share).
 */
export function useDeviceAlerts(user: Person) {
  const workspace = useWorkspace()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    void registerServiceWorker()
    const onStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(DB_PREFIX)) void queryClient.invalidateQueries()
    }
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null
      if (data?.type === 'open' && data.url) window.location.assign(data.url)
    }
    window.addEventListener('storage', onStorage)
    navigator.serviceWorker?.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('storage', onStorage)
      navigator.serviceWorker?.removeEventListener('message', onMessage)
    }
  }, [queryClient])

  useEffect(() => {
    const storage = browserStorage()
    const seen = readJson<string[]>(storage, seenKey(user.id))
    const result = freshNotices(workspace.notifications, user.id, seen)
    if (!seen || result.fresh.length > 0) writeJson(storage, seenKey(user.id), result.seen)
    setBadge(result.unread)
    for (const notice of result.fresh) announce(notice, navigate)
  }, [workspace.notifications, user.id, navigate])
}

function announce(notice: AppNotification, navigate: ReturnType<typeof useNavigate>) {
  if (document.visibilityState === 'visible') {
    toast(notice.title, {
      description: notice.body,
      action: {
        label: 'Ver',
        onClick: () => {
          const target = notificationTarget(notice)
          if (!target) void navigate({ to: '/avisos' })
          else if (!('params' in target)) void navigate({ to: target.to })
          else if ('workId' in target.params)
            void navigate({ to: '/obras/$workId', params: target.params })
          else void navigate({ to: '/presupuestos/$budgetId', params: target.params })
        },
      },
    })
    return
  }
  void showSystemAlert({
    title: notice.title,
    body: notice.body,
    url: notificationUrl(notice),
    tag: notice.id,
  })
}
