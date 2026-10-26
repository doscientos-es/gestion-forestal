export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const STORAGE_PREFIX = 'gestion-forestal:'

/** In-memory fallback when the browser blocks storage (private mode, tests). */
export function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  }
}

let fallback: KeyValueStorage | undefined

export function browserStorage(): KeyValueStorage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  } catch {
    // Access can throw when storage is disabled.
  }
  fallback ??= createMemoryStorage()
  return fallback
}

export function readJson<T>(storage: KeyValueStorage, key: string): T | null {
  const raw = storage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeJson(storage: KeyValueStorage, key: string, value: unknown) {
  storage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
}

export function removeKey(storage: KeyValueStorage, key: string) {
  storage.removeItem(STORAGE_PREFIX + key)
}
