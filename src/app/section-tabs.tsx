import { Tabs, TabsList, TabsTrigger } from '@doscientos/ui'
import { Link, useNavigate } from '@tanstack/react-router'
import { Bell } from 'lucide-react'

import { formatNumber } from '@/shared/lib/format'

import type { Destination } from './navigation'

/**
 * Sibling pages of a sidebar entry (e.g. Facturas · Gastos · Contabilidad), as tabs next to the
 * section name, so it is clear where you are before the page title says what you see.
 */
export function SectionTabs({
  label,
  tabs,
  active,
}: {
  label: string
  tabs: { to: Destination['to']; label: string; count: number }[]
  active: Destination['to'] | undefined
}) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 pb-3 lg:pt-5 lg:pb-0">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{label}</p>
      <Tabs
        selectedKey={active ?? null}
        onSelectionChange={(key) => void navigate({ to: String(key) as Destination['to'] })}
        className="min-w-0 max-w-full"
      >
        <TabsList aria-label={label} className="max-w-full overflow-x-auto">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.to} id={tab.to} className="gap-2 px-3.5">
              {tab.label}
              {tab.count > 0 ? (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {formatNumber(tab.count)}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}

/** Notices: a bell with the unread count, instead of a sidebar entry. */
export function NotificationBell({ unread }: { unread: number }) {
  return (
    <Link
      to="/avisos"
      aria-label={unread > 0 ? `Avisos, ${unread} sin leer` : 'Avisos'}
      className="focus-visible:outline-ring hover:bg-muted touch-target relative inline-flex size-8 shrink-0 items-center justify-center rounded-md focus-visible:outline-2"
    >
      <Bell aria-hidden="true" className="size-4" />
      {unread > 0 ? (
        <span
          aria-hidden="true"
          className="ring-card absolute top-1 right-1 size-2 rounded-full bg-amber-500 ring-2"
        />
      ) : null}
    </Link>
  )
}
