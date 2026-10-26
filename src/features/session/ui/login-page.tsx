import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'

import {
  roleLabels,
  sessionQuery,
  useWorkspace,
  workspaceApi,
  type Person,
  type Role,
} from '@/features/workspace'
import { useCommand } from '@/shared/lib/use-command'
import { Panel } from '@/shared/ui/surface'

const groups: { role: Role; title: string; description: string }[] = [
  {
    role: 'admin',
    title: 'Oficina',
    description: 'Presupuestos, planificación, facturas e informes.',
  },
  {
    role: 'capataz',
    title: 'Capataces',
    description: 'Parte diario de su cuadrilla desde el móvil.',
  },
  { role: 'peon', title: 'Cuadrillas', description: 'Sus próximos trabajos y vacaciones.' },
]

export function LoginPage({ onSignedIn }: { onSignedIn: () => void }) {
  const workspace = useWorkspace()
  const selected = useSuspenseQuery(sessionQuery).data
  const signIn = useCommand((person: Person) => workspaceApi.signIn(person.id), {
    onSuccess: onSignedIn,
  })
  const crewName = (person: Person) =>
    workspace.crews.find((crew) => crew.id === person.crewId)?.name ?? person.title

  return (
    <main className="app-canvas flex items-start justify-center px-4 py-10 lg:items-center">
      <div className="w-full max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Rodal</h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            Gestión forestal: presupuestos, cuadrillas, partes y facturas. Elige un usuario de
            ejemplo para entrar con su rol; los cambios se guardan solo en este navegador.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {groups.map((group) => {
            const people = workspace.people.filter((person) => person.role === group.role)
            const shown = group.role === 'peon' ? people.slice(0, 4) : people
            return (
              <Panel key={group.role} aria-labelledby={`login-${group.role}`}>
                <header className="px-5 pt-5 pb-3">
                  <h2 id={`login-${group.role}`} className="text-[0.9375rem] font-semibold">
                    {group.title}
                  </h2>
                  <p className="text-muted-foreground text-xs">{group.description}</p>
                </header>
                <ul className="divide-border divide-y">
                  {shown.map((person) => (
                    <li key={person.id}>
                      <button
                        type="button"
                        onClick={() => signIn.mutate(person)}
                        className="panel-row focus-visible:outline-ring group flex w-full items-center gap-3 px-5 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {person.name}
                            {selected === person.id ? (
                              <span className="text-muted-foreground ml-2 text-xs font-normal">
                                · sesión actual
                              </span>
                            ) : null}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {group.role === 'admin' ? roleLabels.admin : crewName(person)}
                          </span>
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>
            )
          })}
        </div>
        <p className="text-muted-foreground mt-6 text-center text-xs">
          Selector de demostración: no es un inicio de sesión real. En producción cada persona entra
          con su cuenta y solo ve lo que su rol permite.
        </p>
      </div>
    </main>
  )
}
