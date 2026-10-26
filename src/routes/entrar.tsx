import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { LoginPage } from '@/features/session'
import { prepareApp } from '@/features/workspace'

export const Route = createFileRoute('/entrar')({
  beforeLoad: async ({ context }) => {
    await prepareApp(context.queryClient)
  },
  component: LoginRoute,
})

function LoginRoute() {
  const navigate = useNavigate()
  return <LoginPage onSignedIn={() => void navigate({ to: '/' })} />
}
