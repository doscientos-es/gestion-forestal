import {
  clearDatabase,
  isDatabaseCurrent,
  markDatabaseSeeded,
  writeCollection,
  type CollectionName,
} from '@/shared/data/database'
import { createLocalRepository } from '@/shared/data/local-repository'
import type { IsoDate } from '@/shared/lib/dates'
import {
  browserStorage,
  readJson,
  removeKey,
  writeJson,
  type KeyValueStorage,
} from '@/shared/lib/local-storage'

import type { Workspace } from '../application/model'
import type { Backend, DemoDatabase, SessionRepository } from '../application/ports'
import { buildSeed } from './build-seed'

const SESSION_KEY = 'session'

function createSession(storage: () => KeyValueStorage): SessionRepository {
  return {
    async currentUserId() {
      return readJson<{ personId: string }>(storage(), SESSION_KEY)?.personId ?? null
    },
    async signIn(personId) {
      writeJson(storage(), SESSION_KEY, { personId })
    },
    async signOut() {
      removeKey(storage(), SESSION_KEY)
    },
  }
}

function createDatabase(storage: () => KeyValueStorage, today: () => IsoDate): DemoDatabase {
  const seed = () => {
    const data = buildSeed(today())
    const collections: Record<CollectionName, unknown[]> = {
      clients: data.clients,
      zones: data.zones,
      species: data.species,
      people: data.people,
      crews: data.crews,
      budgets: data.budgets,
      works: data.works,
      assignments: data.assignments,
      reports: data.reports,
      absences: data.absences,
      invoices: data.invoices,
      tasks: data.tasks,
      notifications: data.notifications,
      expenses: data.expenses,
    } satisfies Record<keyof Omit<Workspace, 'version' | 'anchor'>, unknown[]>
    for (const [name, items] of Object.entries(collections)) {
      writeCollection(name as CollectionName, items, storage())
    }
    markDatabaseSeeded(storage())
  }
  return {
    async ensureSeeded() {
      if (!isDatabaseCurrent(storage())) seed()
    },
    async reset() {
      clearDatabase(storage())
      seed()
    },
  }
}

/** Browser-only backend for the demo: JSON collections in localStorage. */
export function createLocalBackend(
  today: () => IsoDate,
  storage: () => KeyValueStorage = browserStorage,
): Backend {
  return {
    repositories: {
      clients: createLocalRepository('clients', storage),
      zones: createLocalRepository('zones', storage),
      species: createLocalRepository('species', storage),
      people: createLocalRepository('people', storage),
      crews: createLocalRepository('crews', storage),
      budgets: createLocalRepository('budgets', storage),
      works: createLocalRepository('works', storage),
      assignments: createLocalRepository('assignments', storage),
      reports: createLocalRepository('reports', storage),
      absences: createLocalRepository('absences', storage),
      invoices: createLocalRepository('invoices', storage),
      tasks: createLocalRepository('tasks', storage),
      notifications: createLocalRepository('notifications', storage),
      expenses: createLocalRepository('expenses', storage),
    },
    session: createSession(storage),
    database: createDatabase(storage, today),
  }
}
