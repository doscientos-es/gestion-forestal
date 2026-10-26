export type Entity = { id: string }

/**
 * Persistence port. Every adapter (localStorage today, Supabase tomorrow) implements
 * this contract, so `api.ts` modules and the UI never know where data lives.
 */
export type Repository<T extends Entity> = {
  list(): Promise<T[]>
  get(id: string): Promise<T | undefined>
  /** Inserts or replaces by `id`. */
  save(entity: T): Promise<T>
  remove(id: string): Promise<void>
}
