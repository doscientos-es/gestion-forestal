import { Alert, AlertDescription, AlertTitle } from '@doscientos/ui'
import { Link } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'

import type { MarginAlert } from '@/features/workspace'
import { formatMoney, formatPercent, formatSignedPercent } from '@/shared/lib/format'

/** Early warning: a work in progress is heading for less margin than the accepted budget. */
export function MarginAlerts({
  alerts,
  linkToWork = true,
}: {
  alerts: MarginAlert[]
  linkToWork?: boolean
}) {
  if (alerts.length === 0) return null
  return (
    <div className="mb-5 space-y-2">
      {alerts.map((alert) => (
        <Alert
          key={alert.work.id}
          variant={alert.severity === 'danger' ? 'destructive' : 'warning'}
        >
          <TriangleAlert aria-hidden="true" className="size-4" />
          <AlertTitle>
            {linkToWork ? (
              <Link
                to="/obras/$workId"
                params={{ workId: alert.work.id }}
                className="focus-visible:outline-ring underline-offset-2 hover:underline focus-visible:outline-2"
              >
                {alert.work.title}
              </Link>
            ) : (
              'Esta obra pierde margen'
            )}
            : rendimiento {formatSignedPercent(alert.yieldDeviation)} sobre lo presupuestado
          </AlertTitle>
          <AlertDescription>
            Al ritmo actual el margen pasaría del {formatPercent(alert.plannedRate)} al{' '}
            {formatPercent(alert.projectedRate)}: unos {formatMoney(alert.lostMargin)} menos de
            beneficio. Conviene revisar el rendimiento de la cuadrilla o renegociar.
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}
