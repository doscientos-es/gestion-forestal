import { DrawerContent, DrawerHeader, DrawerTitle } from '@doscientos/ui'
import { Link } from '@tanstack/react-router'
import { Ellipsis, Plus, RotateCcw, UserRound } from 'lucide-react'
import { useState } from 'react'

import { canAccess, roleLabels, type Area, type Person } from '@/features/workspace'
import { formatNumber } from '@/shared/lib/format'

import { destinations, isActive } from './navigation'
import { primaryShortcut } from './sidebar-parts'

const MAIN_TABS = 3

/** Floating dark pill: main destinations, a "More" sheet for the rest and the primary action. */
export function MobileNavigation({
  user,
  pathname,
  counts,
  onReset,
}: {
  user: Person
  pathname: string
  counts: Partial<Record<Area, number>>
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const allowed = destinations.filter((item) => canAccess(user.role, item.area))
  // The office lives in budgets and works; crews and workers need their notices one tap away.
  const preferred: Area[] =
    user.role === 'admin' ? ['inicio', 'presupuestos', 'obras'] : ['inicio', 'obras', 'avisos']
  const tabs = preferred
    .map((area) => allowed.find((item) => item.area === area))
    .filter((item) => item !== undefined)
    .slice(0, MAIN_TABS)
  const overflow = allowed.filter((item) => !tabs.includes(item))
  const moreActive = overflow.some((item) => isActive(item.to, pathname))
  const shortcut = primaryShortcut(user)
  const pending = overflow.reduce((sum, item) => sum + (counts[item.area] ?? 0), 0)

  return (
    <div className="mobile-dock mobile-only">
      <nav aria-label="Navegación móvil" className="mobile-nav">
        {tabs.map((item) => {
          const count = item.area === 'avisos' ? (counts[item.area] ?? 0) : 0
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={count > 0 ? `${item.label}, ${count} sin leer` : item.label}
              aria-current={isActive(item.to, pathname) ? 'page' : undefined}
              className="nav-link relative"
            >
              <item.icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
              <span className="nav-label truncate">{item.short}</span>
              {count > 0 ? <span aria-hidden="true" className="nav-dot" /> : null}
            </Link>
          )
        })}
        <button
          type="button"
          aria-label={pending > 0 ? `Más opciones, ${pending} pendientes` : 'Más opciones'}
          aria-current={moreActive ? 'page' : undefined}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className="nav-link relative"
        >
          <Ellipsis aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
          <span className="nav-label truncate">Más</span>
          {pending > 0 ? <span aria-hidden="true" className="nav-dot" /> : null}
        </button>
      </nav>
      <Link to={shortcut.to} aria-label={shortcut.label} className="mobile-fab">
        <Plus aria-hidden="true" className="size-6" />
      </Link>
      <DrawerContent isOpen={open} onOpenChange={setOpen} side="bottom" className="mobile-sheet">
        <DrawerHeader>
          <DrawerTitle>{user.name}</DrawerTitle>
          <p className="text-muted-foreground text-xs">{roleLabels[user.role]}</p>
        </DrawerHeader>
        <ul className="divide-border divide-y px-2 pb-2">
          {allowed.map((item) => {
            const count = counts[item.area]
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.to, pathname) ? 'page' : undefined}
                  className="sheet-link"
                >
                  <item.icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                  <span className="flex-1">{item.label}</span>
                  {count ? <span className="nav-count">{formatNumber(count)}</span> : null}
                </Link>
              </li>
            )
          })}
          <li>
            <Link to="/entrar" onClick={() => setOpen(false)} className="sheet-link">
              <UserRound aria-hidden="true" className="size-5" strokeWidth={1.75} />
              <span className="flex-1">Cambiar de usuario</span>
            </Link>
          </li>
          <li>
            <button
              type="button"
              className="sheet-link w-full text-left"
              onClick={() => {
                setOpen(false)
                onReset()
              }}
            >
              <RotateCcw aria-hidden="true" className="size-5" strokeWidth={1.75} />
              <span className="flex-1">Restablecer datos de ejemplo</span>
            </button>
          </li>
        </ul>
      </DrawerContent>
    </div>
  )
}
