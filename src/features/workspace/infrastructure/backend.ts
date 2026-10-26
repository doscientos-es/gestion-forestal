import { clock } from '@/shared/lib/clock'

import type { ApiDeps } from '../application/ports'
import { createLocalBackend } from './local-backend'

/**
 * Composition root of persistence. To move to Supabase, build a `Backend` whose
 * repositories call the database and return it here: nothing else changes.
 */
export const backend = createLocalBackend(() => clock.today())

export const apiDeps: ApiDeps = {
  repositories: backend.repositories,
  newId: () => clock.id(),
  today: () => clock.today(),
}
