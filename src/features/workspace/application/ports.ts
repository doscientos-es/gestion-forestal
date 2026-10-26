import type { Repository } from '@/shared/data/repository'
import type { IsoDate } from '@/shared/lib/dates'

import type {
  AppNotification,
  WorkTask,
  Absence,
  Assignment,
  Budget,
  Client,
  Crew,
  DailyReport,
  Expense,
  InvoiceDraft,
  Person,
  Species,
  Work,
  Zone,
} from './model'

/** One repository per aggregate. Swap the adapter in `infrastructure/backend.ts`. */
export type Repositories = {
  clients: Repository<Client>
  zones: Repository<Zone>
  species: Repository<Species>
  people: Repository<Person>
  crews: Repository<Crew>
  budgets: Repository<Budget>
  works: Repository<Work>
  assignments: Repository<Assignment>
  reports: Repository<DailyReport>
  absences: Repository<Absence>
  invoices: Repository<InvoiceDraft>
  tasks: Repository<WorkTask>
  notifications: Repository<AppNotification>
  expenses: Repository<Expense>
}

/** Who is signed in. Production replaces it with the Supabase Auth session. */
export type SessionRepository = {
  currentUserId(): Promise<string | null>
  signIn(personId: string): Promise<void>
  signOut(): Promise<void>
}

/** Demo-only lifecycle: seed the dataset and restore it. */
export type DemoDatabase = {
  ensureSeeded(): Promise<void>
  reset(): Promise<void>
}

export type Backend = {
  repositories: Repositories
  session: SessionRepository
  database: DemoDatabase
}

/** Everything an `api.ts` factory needs; tests inject deterministic values. */
export type ApiDeps = {
  repositories: Repositories
  newId: () => string
  today: () => IsoDate
}
