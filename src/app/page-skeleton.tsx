import { Skeleton } from '@doscientos/ui'

/** Loading state shaped like a list page: title, filters and rows. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="panel divide-border divide-y">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
