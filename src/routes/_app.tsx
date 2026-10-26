import { Navigate, Outlet, createFileRoute } from '@tanstack/react-router'

import { AppFrame } from '@/app/app-frame'
import { requireUser } from '@/app/route-guards'
import { useCurrentUser } from '@/features/workspace'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    await requireUser(context)
  },
  component: AppLayout,
})

function AppLayout() {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/entrar" />
  return (
    <AppFrame user={user}>
      <Outlet />
    </AppFrame>
  )
}
