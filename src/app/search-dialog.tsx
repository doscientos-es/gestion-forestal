import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  cn,
} from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { Calculator, Search, TreePine, type LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { canAccess, lookup, type Person, type Workspace } from '@/features/workspace'

import { destinations } from './navigation'

type Target =
  | {
    to:
    | '/'
    | '/presupuestos'
    | '/obras'
    | '/planificacion'
    | '/parte'
    | '/ausencias'
    | '/avisos'
    | '/facturas'
    | '/clientes'
    | '/contabilidad'
  }
  | { to: '/obras/$workId'; params: { workId: string } }
  | { to: '/presupuestos/$budgetId'; params: { budgetId: string } }

type Result = { key: string; label: string; hint: string; icon: LucideIcon; target: Target }

/** Everything the user can jump to: sections, works and (for the office) budgets. */
function buildResults(workspace: Workspace, user: Person): Result[] {
  const find = lookup(workspace)
  const sections = destinations
    .filter((item) => canAccess(user.role, item.area))
    .map((item) => ({
      key: item.to,
      label: item.label,
      hint: 'Ir a',
      icon: item.icon,
      target: { to: item.to } as Target,
    }))
  const myWorks = workspace.works.filter(
    (work) =>
      user.role === 'admin' ||
      workspace.assignments.some(
        (assignment) => assignment.workId === work.id && assignment.crewId === user.crewId,
      ),
  )
  const works = myWorks.map((work) => ({
    key: work.id,
    label: work.title,
    hint: `${work.code} · ${find.client(work.clientId)?.name ?? ''}`,
    icon: TreePine,
    target: { to: '/obras/$workId', params: { workId: work.id } } as Target,
  }))
  const budgets =
    user.role === 'admin'
      ? workspace.budgets.map((budget) => ({
        key: budget.id,
        label: budget.title,
        hint: `${budget.number} · ${find.client(budget.clientId)?.name ?? ''}`,
        icon: Calculator,
        target: { to: '/presupuestos/$budgetId', params: { budgetId: budget.id } } as Target,
      }))
      : []
  return [...sections, ...works, ...budgets]
}

export function SearchDialog({
  open,
  onOpenChange,
  user,
  workspace,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: Person
  workspace: Workspace
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const text = query.trim().toLowerCase()
  const results = buildResults(workspace, user)
    .filter((item) => !text || `${item.label} ${item.hint}`.toLowerCase().includes(text))
    .slice(0, 8)
  const current = Math.min(active, Math.max(0, results.length - 1))

  const go = (result: Result | undefined) => {
    if (!result) return
    onOpenChange(false)
    setQuery('')
    void navigate(result.target)
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))] gap-3 rounded-xl">
        <DialogHeader>
          <DialogTitle>Buscar y saltar a…</DialogTitle>
          <DialogDescription>Pantallas, obras y presupuestos. Enter para abrir.</DialogDescription>
        </DialogHeader>
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden="true" className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label="Buscar"
            placeholder="Escribe una pantalla, obra o cliente"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActive(Math.min(current + 1, results.length - 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActive(Math.max(current - 1, 0))
              } else if (event.key === 'Enter') {
                go(results[current])
              }
            }}
          />
        </InputGroup>
        {results.length === 0 ? (
          <p className="text-muted-foreground px-1 py-4 text-sm">Nada coincide con «{query}».</p>
        ) : (
          <ul className="-mx-1 max-h-80 overflow-y-auto">
            {results.map((result, index) => (
              <li key={result.key}>
                <button
                  type="button"
                  aria-label={`${result.label}, ${result.hint}`}
                  onClick={() => go(result)}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left',
                    index === current && 'bg-muted',
                  )}
                >
                  <result.icon
                    aria-hidden="true"
                    className="text-muted-foreground size-4 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{result.label}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {result.hint}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </DialogRoot>
  )
}
