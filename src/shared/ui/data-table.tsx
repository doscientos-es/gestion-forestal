import {
  Checkbox,
  DropdownMenu,
  IconButton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@doscientos/ui'
import { ChevronRight, Ellipsis } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { formatNumber } from '@/shared/lib/format'

export type Column<T> = {
  id: string
  header: string
  cell: (row: T) => ReactNode
  align?: 'right'
  /** Hidden below the `md` breakpoint to keep phones readable. */
  secondary?: boolean
  className?: string
}

type Selection = { selected: string[]; onToggle: (id: string) => void }

/** Overflow menu for per-row actions. Put `DropdownMenuItem`s inside. */
export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu
      placement="bottom end"
      trigger={
        <IconButton label={label} variant="ghost" size="icon-sm" className="touch-target">
          <Ellipsis aria-hidden="true" className="size-4" />
        </IconButton>
      }
    >
      {children}
    </DropdownMenu>
  )
}

/**
 * Table with a header, an obvious "open" affordance, per-row actions and pagination.
 * The whole row opens the record; the first cell is a real button for keyboard users.
 */
export function DataTable<T>({
  label,
  rows,
  columns,
  getKey,
  onOpen,
  openLabel,
  actions,
  select,
  pageSize = 10,
  footer,
  narrow,
}: {
  label: string
  rows: T[]
  columns: Column<T>[]
  getKey: (row: T) => string
  onOpen: (row: T) => void
  openLabel: (row: T) => string
  actions?: (row: T) => ReactNode
  select?: Selection
  pageSize?: number
  footer?: ReactNode
  /** Key data of the hidden secondary columns (e.g. the status), shown under the title on phones. */
  narrow?: (row: T) => ReactNode
}) {
  const [requested, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = Math.min(requested, pageCount)
  const start = (page - 1) * pageSize
  const visible = rows.slice(start, start + pageSize)
  const range = `${formatNumber(start + 1)}–${formatNumber(start + visible.length)} de ${formatNumber(rows.length)}`
  const cellClass = (column: Column<T>) =>
    cn(
      column.secondary && 'col-secondary',
      column.align === 'right' && 'text-right',
      column.className,
    )

  return (
    <div>
      <Table aria-label={label}>
        <TableHeader>
          <TableRow>
            {select ? (
              <TableHead className="w-10">
                <span className="sr-only">Seleccionar</span>
              </TableHead>
            ) : null}
            {columns.map((column) => (
              <TableHead key={column.id} scope="col" className={cellClass(column)}>
                {column.header}
              </TableHead>
            ))}
            <TableHead className="w-24">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row) => {
            const key = getKey(row)
            return (
              <TableRow key={key} className="group cursor-pointer" onClick={() => onOpen(row)}>
                {select ? (
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      aria-label={`Seleccionar ${openLabel(row)}`}
                      isSelected={select.selected.includes(key)}
                      onChange={() => select.onToggle(key)}
                    />
                  </TableCell>
                ) : null}
                {columns.map((column, index) => (
                  <TableCell key={column.id} className={cellClass(column)}>
                    {index === 0 ? (
                      <button
                        type="button"
                        aria-label={openLabel(row)}
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpen(row)
                        }}
                        className="focus-visible:outline-ring block w-full min-w-0 rounded-sm text-left focus-visible:outline-2"
                      >
                        {column.cell(row)}
                        {narrow ? <span className="narrow-only mt-1.5">{narrow(row)}</span> : null}
                      </button>
                    ) : (
                      column.cell(row)
                    )}
                  </TableCell>
                ))}
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {actions?.(row)}
                    <ChevronRight
                      aria-hidden="true"
                      className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
        <div className="text-muted-foreground text-sm">{footer}</div>
        {pageCount > 1 ? (
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            ariaLabel={`Páginas de ${label}`}
            summary={range}
          />
        ) : (
          <span className="text-muted-foreground text-sm">{range}</span>
        )}
      </div>
    </div>
  )
}
