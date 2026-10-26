import {
  DataViewState,
  DataViewStateActions,
  DataViewStateDescription,
  DataViewStateTitle,
} from '@doscientos/ui'
import type { ReactNode } from 'react'

/** Empty or no-results state with an icon, a useful sentence and the action that resolves it. */
export function EmptyPanel({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <DataViewState className="rounded-none border-0 py-12">
      <span
        aria-hidden="true"
        className="border-border bg-muted text-muted-foreground mx-auto mb-3 flex size-11 items-center justify-center rounded-full border"
      >
        {icon}
      </span>
      <DataViewStateTitle>{title}</DataViewStateTitle>
      <DataViewStateDescription>{description}</DataViewStateDescription>
      {action ? <DataViewStateActions>{action}</DataViewStateActions> : null}
    </DataViewState>
  )
}
