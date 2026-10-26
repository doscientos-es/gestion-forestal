import { useCurrentUser, useWorkspace } from '@/features/workspace'
import { clock } from '@/shared/lib/clock'

import { AdminHome } from './admin-home'
import { CrewHome } from './crew-home'

export function HomePage() {
  const workspace = useWorkspace()
  const user = useCurrentUser()
  const today = clock.today()
  if (!user) return null
  return user.role === 'admin' ? (
    <AdminHome user={user} workspace={workspace} today={today} />
  ) : (
    <CrewHome user={user} workspace={workspace} today={today} />
  )
}
