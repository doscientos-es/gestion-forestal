import {
  browserStorage,
  readJson,
  writeJson,
  type KeyValueStorage,
} from '@/shared/lib/local-storage'

import { collectionKey, type CollectionName } from './database'
import type { Entity, Repository } from './repository'

/** localStorage adapter of the repository port. Data never leaves the browser. */
export function createLocalRepository<T extends Entity>(
  collection: CollectionName,
  storage: () => KeyValueStorage = browserStorage,
): Repository<T> {
  const key = collectionKey(collection)
  const read = () => readJson<T[]>(storage(), key) ?? []
  const write = (items: T[]) => writeJson(storage(), key, items)

  return {
    async list() {
      return read()
    },
    async get(id) {
      return read().find((item) => item.id === id)
    },
    async save(entity) {
      const items = read()
      const index = items.findIndex((item) => item.id === entity.id)
      if (index >= 0) items[index] = entity
      else items.unshift(entity)
      write(items)
      return entity
    },
    async remove(id) {
      write(read().filter((item) => item.id !== id))
    },
  }
}
