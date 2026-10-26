import type { Entity, Repository } from '@/shared/data/repository'
import { startOfWeek } from '@/shared/lib/dates'

import type { Context } from './commands'
import type { Workspace } from './model'
import type { ApiDeps, Repositories } from './ports'

type Collections = Omit<Workspace, 'version' | 'anchor'>

const collectionNames = [
  'clients',
  'zones',
  'species',
  'people',
  'crews',
  'budgets',
  'works',
  'assignments',
  'reports',
  'absences',
  'invoices',
  'tasks',
  'notifications',
  'expenses',
] as const satisfies readonly (keyof Collections & keyof Repositories)[]

/** Reads every aggregate and assembles the snapshot the domain functions work on. */
export async function loadWorkspace(deps: ApiDeps): Promise<Workspace> {
  const entries = await Promise.all(
    collectionNames.map(async (name) => [name, await deps.repositories[name].list()] as const),
  )
  return {
    version: 1,
    anchor: startOfWeek(deps.today()),
    ...(Object.fromEntries(entries) as unknown as Collections),
  }
}

/**
 * Persists only what a domain function changed: entities are compared by reference,
 * so untouched records are never rewritten (and a real backend never receives them).
 */
export async function commit(deps: ApiDeps, previous: Workspace, next: Workspace): Promise<void> {
  for (const name of collectionNames) {
    const before = previous[name] as { id: string }[]
    const after = next[name] as { id: string }[]
    if (before === after) continue
    const repository = deps.repositories[name] as Repository<Entity>
    const known = new Map(before.map((item) => [item.id, item]))
    const kept = new Set<string>()
    // Oldest first, so `save` (which prepends) leaves the newest record on top.
    for (const item of [...after].reverse()) {
      kept.add(item.id)
      if (known.get(item.id) !== item) await repository.save(item)
    }
    for (const item of before) if (!kept.has(item.id)) await repository.remove(item.id)
  }
}

export function commandContext(deps: ApiDeps): Context {
  return { id: deps.newId, today: deps.today() }
}

/** Load → run a pure domain function → persist the difference → return its result. */
export async function mutate<Result>(
  deps: ApiDeps,
  operation: (workspace: Workspace) => { workspace: Workspace; result: Result },
): Promise<Result> {
  const previous = await loadWorkspace(deps)
  const { workspace, result } = operation(previous)
  await commit(deps, previous, workspace)
  return result
}
