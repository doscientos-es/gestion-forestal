import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@doscientos/ui'
import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

import { formatNumber } from '@/shared/lib/format'

export type FilterOption<T extends string> = { value: T; label: string; count: number }

/** Filters as tabs with a counter, built on the `Tabs` primitive (arrow keys, aria-selected). */
export function FilterTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: FilterOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <Tabs selectedKey={value} onSelectionChange={(key) => onChange(String(key) as T)}>
      <TabsList aria-label={label} className="max-w-full overflow-x-auto">
        {options.map((option) => (
          <TabsTrigger key={option.value} id={option.value} className="gap-2">
            {option.label}
            <span className="text-muted-foreground text-xs tabular-nums">
              {formatNumber(option.count)}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

/**
 * One-line filter row on desktop: tabs on the left, secondary filters and search pushed right.
 * Stacks on phones, where the controls keep sharing a single row.
 */
export function FilterToolbar({ tabs, children }: { tabs: ReactNode; children?: ReactNode }) {
  return (
    <div className="filter-toolbar">
      <div className="filter-toolbar__tabs">{tabs}</div>
      <div className="filter-toolbar__controls">{children}</div>
    </div>
  )
}

export function SearchField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <InputGroup className="min-w-0 flex-1 lg:max-w-72">
      <InputGroupAddon>
        <Search aria-hidden="true" className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </InputGroup>
  )
}
