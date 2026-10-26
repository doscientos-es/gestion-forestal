import { Badge, cn, type BadgeProps } from '@doscientos/ui'
import type { ComponentProps, ReactNode } from 'react'

import type { Tone } from '@/shared/lib/tone'

const badgeTone: Record<Tone, NonNullable<BadgeProps['variant']>> = {
  green: 'success',
  teal: 'info',
  amber: 'warning',
  purple: 'secondary',
  blue: 'info',
  red: 'danger',
  gray: 'neutral',
}

/** White rounded surface used for every list and summary block. */
export function Panel({ className, children, ...props }: ComponentProps<'section'>) {
  return (
    <section className={cn('panel', className)} {...props}>
      {children}
    </section>
  )
}

export function PanelHeader({
  icon,
  title,
  description,
  meta,
  action,
  id,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  meta?: ReactNode
  action?: ReactNode
  id?: string
}) {
  return (
    <header className="border-border flex min-h-16 items-center gap-3 border-b px-5 py-3">
      {icon ? (
        <span aria-hidden="true" className="text-foreground flex size-5 shrink-0 items-center">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h2 id={id} className="truncate text-[0.9375rem] font-semibold tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-muted-foreground line-clamp-2 text-xs">{description}</p>
        ) : null}
      </div>
      {meta ? (
        <span className="text-foreground shrink-0 text-sm font-medium tabular-nums">{meta}</span>
      ) : null}
      {action}
    </header>
  )
}

export function PanelFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="text-muted-foreground flex items-center justify-between gap-3 px-5 py-4 text-sm">
      {children}
    </footer>
  )
}

export function Tag({
  tone = 'gray',
  dot = false,
  children,
  className,
}: {
  tone?: Tone
  dot?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <Badge variant={badgeTone[tone]} className={cn('gap-1.5 whitespace-nowrap', className)}>
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </Badge>
  )
}

export function ProgressBar({
  value,
  label,
  tone = 'brand',
  className,
}: {
  /** 0–1 */
  value: number
  label: string
  tone?: 'brand' | 'warning' | 'muted'
  className?: string
}) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)))
  const fill = tone === 'warning' ? 'bg-amber-500' : tone === 'muted' ? 'bg-zinc-400' : 'bg-brand'
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn('bg-muted h-1.5 w-full overflow-hidden rounded-full', className)}
    >
      <div className={cn('h-full rounded-full', fill)} style={{ width: `${percent}%` }} />
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p> : null}
    </div>
  )
}
