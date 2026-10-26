import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'

import { canAccess, prepareApp, type Area } from '@/features/workspace'

type GuardContext = { queryClient: QueryClient }

/**
 * Demo guard: the user picker is not authentication. In production the session
 * comes from Supabase Auth and RLS enforces the same access on the server.
 */
export async function requireUser({ queryClient }: GuardContext) {
  const { user, workspace } = await prepareApp(queryClient)
  if (!user) throw redirect({ to: '/entrar' })
  return { user, workspace }
}

export async function requireArea(context: GuardContext, area: Area) {
  const result = await requireUser(context)
  if (!canAccess(result.user.role, area)) throw redirect({ to: '/' })
  return result
}
