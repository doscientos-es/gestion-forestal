import { TrendingDown, TrendingUp } from 'lucide-react'

import { formatSignedPercent } from '@/shared/lib/format'
import { Tag } from '@/shared/ui/surface'

/** Yield deviation badge: icon + signed text, never colour alone. */
export function YieldDeviation({ value, hasData }: { value: number; hasData: boolean }) {
  if (!hasData) return <span className="text-muted-foreground text-xs">Sin partes</span>
  const below = value < -0.03
  const Icon = value < 0 ? TrendingDown : TrendingUp
  return (
    <Tag tone={below ? 'amber' : 'green'}>
      <Icon aria-hidden="true" className="size-3.5" />
      {formatSignedPercent(value)} rendimiento
    </Tag>
  )
}
