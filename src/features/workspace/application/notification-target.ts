import type { AppNotification } from './model'

/** Where a notice leads. Typed so the router can navigate to it without string building. */
export type NotificationTarget =
  | { to: '/' | '/gastos' | '/ausencias' | '/presupuestos' }
  | { to: '/obras/$workId'; params: { workId: string } }
  | { to: '/presupuestos/$budgetId'; params: { budgetId: string } }

export function notificationTarget(
  notice: Pick<AppNotification, 'kind' | 'workId' | 'budgetId'>,
): NotificationTarget | null {
  if (notice.kind.startsWith('gasto')) return { to: '/gastos' }
  if (notice.budgetId)
    return { to: '/presupuestos/$budgetId', params: { budgetId: notice.budgetId } }
  if (notice.workId) return { to: '/obras/$workId', params: { workId: notice.workId } }
  if (notice.kind.startsWith('ausencia')) return { to: '/ausencias' }
  if (notice.kind === 'presupuesto_respondido') return { to: '/presupuestos' }
  if (notice.kind === 'cuadrilla_cambiada') return { to: '/' }
  return null
}

/** The same target as a plain path, for system notifications that open the app from outside. */
export function notificationUrl(notice: Pick<AppNotification, 'kind' | 'workId' | 'budgetId'>) {
  const target = notificationTarget(notice)
  if (!target) return '/avisos'
  if ('params' in target) {
    return 'budgetId' in target.params
      ? `/presupuestos/${target.params.budgetId}`
      : `/obras/${target.params.workId}`
  }
  return target.to
}

/**
 * Notices addressed to `personId` that the device has not shown yet. `seen` is what was already
 * shown (null the first time: the backlog is marked as seen, never replayed as alerts).
 */
export function freshNotices(
  notifications: AppNotification[],
  personId: string,
  seen: string[] | null,
) {
  const mine = notifications.filter((item) => item.personId === personId)
  const ids = mine.map((item) => item.id)
  if (seen === null)
    return { fresh: [], seen: ids, unread: mine.filter((item) => !item.read).length }
  const known = new Set(seen)
  return {
    fresh: mine.filter((item) => !item.read && !known.has(item.id)),
    seen: ids,
    unread: mine.filter((item) => !item.read).length,
  }
}
