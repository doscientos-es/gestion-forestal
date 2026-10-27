import {
  browserStorage,
  readJson,
  removeKey,
  writeJson,
  type KeyValueStorage,
} from '@/shared/lib/local-storage'

/** Collections of the demo database. A real backend maps each one to a table. */
export const collections = [
  'clients',
  'zones',
  'species',
  'people',
  'crews',
  'budgets',
  'works',
  'reports',
  'assignments',
  'absences',
  'invoices',
  'tasks',
  'notifications',
  'expenses',
  'activity',
] as const

export type CollectionName = (typeof collections)[number]

/** Bump when the seed or the stored shape changes: the demo re-seeds on mismatch. */
export const DATABASE_VERSION = 6

const META_KEY = 'db:meta'

export function collectionKey(name: CollectionName) {
  return `db:${name}`
}

export function isDatabaseCurrent(storage: KeyValueStorage = browserStorage()) {
  return readJson<{ version: number }>(storage, META_KEY)?.version === DATABASE_VERSION
}

export function writeCollection<T>(
  name: CollectionName,
  items: T[],
  storage: KeyValueStorage = browserStorage(),
) {
  writeJson(storage, collectionKey(name), items)
}

export function markDatabaseSeeded(storage: KeyValueStorage = browserStorage()) {
  writeJson(storage, META_KEY, { version: DATABASE_VERSION })
}

export function clearDatabase(storage: KeyValueStorage = browserStorage()) {
  for (const name of collections) removeKey(storage, collectionKey(name))
  removeKey(storage, META_KEY)
}
