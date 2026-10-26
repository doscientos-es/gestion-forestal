import { queryOptions, useSuspenseQuery, type QueryClient } from '@tanstack/react-query'

import { workspaceApi } from './api'
import type { Person, Workspace } from './application/model'

export const workspaceQuery = queryOptions({
  queryKey: ['workspace'],
  queryFn: () => workspaceApi.getWorkspace(),
})

export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: () => workspaceApi.getSessionUserId(),
})

/** Seeds the demo data and warms the caches so screens render without a loading flash. */
export async function prepareApp(queryClient: QueryClient) {
  await workspaceApi.ensureReady()
  const [workspace, userId] = await Promise.all([
    queryClient.ensureQueryData(workspaceQuery),
    queryClient.ensureQueryData(sessionQuery),
  ])
  return { workspace, user: workspace.people.find((person) => person.id === userId) ?? null }
}

export function useWorkspace(): Workspace {
  return useSuspenseQuery(workspaceQuery).data
}

export function useCurrentUser(): Person | null {
  const workspace = useWorkspace()
  const userId = useSuspenseQuery(sessionQuery).data
  return workspace.people.find((person) => person.id === userId) ?? null
}
