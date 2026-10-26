import type { Person, Workspace } from './application/model'
import { loadWorkspace } from './application/persistence'
import type { ApiDeps, Backend } from './application/ports'
import { apiDeps, backend } from './infrastructure/backend'

export type WorkspaceApi = {
  /** Seeds the demo dataset the first time (or when the stored version is outdated). */
  ensureReady(): Promise<void>
  getWorkspace(): Promise<Workspace>
  getSessionUserId(): Promise<string | null>
  getCurrentUser(): Promise<Person | null>
  signIn(personId: string): Promise<void>
  signOut(): Promise<void>
  resetDemo(): Promise<void>
}

export function createWorkspaceApi(
  deps: ApiDeps,
  backendPorts: Pick<Backend, 'session' | 'database'>,
): WorkspaceApi {
  const getSessionUserId = () => backendPorts.session.currentUserId()
  return {
    ensureReady: () => backendPorts.database.ensureSeeded(),
    getWorkspace: () => loadWorkspace(deps),
    getSessionUserId,
    async getCurrentUser() {
      const id = await getSessionUserId()
      return id ? ((await deps.repositories.people.get(id)) ?? null) : null
    },
    signIn: (personId) => backendPorts.session.signIn(personId),
    signOut: () => backendPorts.session.signOut(),
    resetDemo: () => backendPorts.database.reset(),
  }
}

export const workspaceApi = createWorkspaceApi(apiDeps, backend)
