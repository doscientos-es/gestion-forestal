import {
  IconButton,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderHeading,
  PageHeaderTitle,
} from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

type BackTarget = { to: '/presupuestos' | '/obras' | '/planificacion'; label: string }

/** Sticky page header: title, optional back button, secondary actions and the primary action. */
export function PageTop({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  back?: BackTarget
}) {
  const navigate = useNavigate()
  return (
    <div className="page-top">
      <PageHeader className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {back ? (
          <IconButton
            label={back.label}
            variant="ghost"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onPress={() => void navigate({ to: back.to })}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </IconButton>
        ) : null}
        <PageHeaderHeading className="min-w-0 flex-1">
          <PageHeaderTitle>{title}</PageHeaderTitle>
          {description ? <PageHeaderDescription>{description}</PageHeaderDescription> : null}
        </PageHeaderHeading>
        {actions ? (
          <PageHeaderActions className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            {actions}
          </PageHeaderActions>
        ) : null}
      </PageHeader>
    </div>
  )
}
