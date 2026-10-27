import { Button, IconButton } from '@doscientos/ui'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeftRight, Plus, Sprout } from 'lucide-react'

import {
  calculatePerformance,
  canAccess,
  roleLabels,
  type Area,
  type Person,
  type Workspace,
} from '@/features/workspace'
import { formatNumber } from '@/shared/lib/format'
import { ProgressBar } from '@/shared/ui/surface'

import { destinations, isActive } from './navigation'

export function UserHeader({ user }: { user: Person }) {
  const navigate = useNavigate()
  return (
    <div className="bg-card border-border flex items-center gap-2 rounded-lg border py-2 pr-2 pl-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="text-muted-foreground truncate text-xs">{roleLabels[user.role]}</p>
      </div>
      <IconButton
        label="Cambiar de usuario"
        variant="ghost"
        size="icon-sm"
        onPress={() => void navigate({ to: '/entrar' })}
      >
        <ArrowLeftRight aria-hidden="true" className="size-4" />
      </IconButton>
    </div>
  )
}

export function NavigationGroups({
  user,
  pathname,
  counts,
}: {
  user: Person
  pathname: string
  counts: Partial<Record<Area, number>>
}) {
  const visible = destinations.filter((item) => canAccess(user.role, item.area))
  const groups = [...new Set(visible.map((item) => item.group))]
  return (
    <nav aria-label="Navegación principal" className="space-y-4">
      {groups.map((group) => (
        <div key={group}>
          <p className="text-muted-foreground mb-1 px-3 text-xs font-medium tracking-wide uppercase">
            {group}
          </p>
          <ul className="space-y-0.5">
            {visible
              .filter((item) => item.group === group)
              .map((item) => {
                const active = isActive(item.to, pathname)
                const count = counts[item.area]
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="nav-link"
                      aria-current={active ? 'page' : undefined}
                    >
                      <item.icon
                        aria-hidden="true"
                        className="size-4.5 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="truncate">{item.label}</span>
                      {count ? <span className="nav-count">{formatNumber(count)}</span> : null}
                    </Link>
                  </li>
                )
              })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/** Season progress card, the equivalent of the "storage" card in the reference. */
export function SeasonCard({ workspace }: { workspace: Workspace }) {
  const year = Math.max(...workspace.works.map((work) => work.year))
  const works = workspace.works.filter((work) => work.year === year)
  const planned = works.reduce((sum, work) => sum + work.planned.plants, 0)
  const planted = works.reduce(
    (sum, work) => sum + calculatePerformance(work, workspace.reports, workspace.people).plants,
    0,
  )
  const ratio = planned > 0 ? Math.min(1, planted / planned) : 0
  return (
    <div className="bg-card border-border rounded-lg border p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Sprout aria-hidden="true" className="text-brand size-4" />
        Campaña {year}
      </p>
      <ProgressBar
        className="mt-3"
        value={ratio}
        label={`Campaña ${year}: ${Math.round(ratio * 100)} % de plantas puestas`}
      />
      <p className="text-muted-foreground mt-2 text-xs tabular-nums">
        {formatNumber(planted)} de {formatNumber(planned)} plantas
      </p>
    </div>
  )
}

/** The one main action of each role, shared by the sidebar button and the mobile "+" button. */
export function primaryShortcut(user: Person) {
  return user.role === 'admin'
    ? { to: '/presupuestos/nuevo' as const, label: 'Nuevo presupuesto' }
    : user.role === 'capataz'
      ? { to: '/parte' as const, label: 'Rellenar parte de hoy' }
      : { to: '/ausencias' as const, label: 'Pedir vacaciones' }
}

export function PrimaryShortcut({ user }: { user: Person }) {
  const shortcut = primaryShortcut(user)
  const navigate = useNavigate()
  return (
    <Button size="lg" className="w-full" onPress={() => void navigate({ to: shortcut.to })}>
      <Plus aria-hidden="true" className="size-4" />
      {shortcut.label}
    </Button>
  )
}
