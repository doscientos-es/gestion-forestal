/** Browser side of installing the app and showing system alerts. Kept out of the domain. */

export type AlertPermission = 'granted' | 'denied' | 'default' | 'unsupported'

export function alertPermission(): AlertPermission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

export async function askAlertPermission(): Promise<AlertPermission> {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.requestPermission()
}

/** Registers the service worker (production only: in dev it would cache stale code). */
export async function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

type SystemAlert = { title: string; body: string; url: string; tag: string }

/** Shows a system notification (through the service worker when there is one). */
export async function showSystemAlert(alert: SystemAlert) {
  if (alertPermission() !== 'granted') return false
  const options = {
    body: alert.body,
    tag: alert.tag,
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: { url: alert.url },
  }
  try {
    const registration =
      'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
    if (registration) await registration.showNotification(alert.title, options)
    else new Notification(alert.title, options)
    return true
  } catch {
    return false
  }
}

type BadgeNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

/** The number on the installed app's icon. Ignored where the browser has no badge API. */
export function setBadge(count: number) {
  const nav = navigator as BadgeNavigator
  if (count > 0) void nav.setAppBadge?.(count).catch(() => undefined)
  else void nav.clearAppBadge?.().catch(() => undefined)
}

type InstallEvent = Event & { prompt: () => Promise<void> }
let installEvent: InstallEvent | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installEvent = event as InstallEvent
    listeners.forEach((listener) => listener())
  })
  window.addEventListener('appinstalled', () => {
    installEvent = null
    listeners.forEach((listener) => listener())
  })
}

export const installPrompt = {
  available: () => installEvent !== null,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => void listeners.delete(listener)
  },
  async run() {
    if (!installEvent) return
    await installEvent.prompt()
    installEvent = null
    listeners.forEach((listener) => listener())
  },
}

export function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}
