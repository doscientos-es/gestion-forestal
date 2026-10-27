import { Button, DropdownMenuItem } from '@doscientos/ui'
import { MessageCircle, Plus, UserRoundX, Users } from 'lucide-react'

import {
  absenceOn,
  assignmentOn,
  roleLabels,
  vacationBalance,
  whatsappLink,
  useWorkspace,
  type Crew,
  type Person,
} from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { formatNumber, pluralize } from '@/shared/lib/format'
import { RowMenu } from '@/shared/ui/data-table'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

export type CrewActions = {
  onAdd: (crewId: string | null) => void
  onEdit: (person: Person) => void
  onMove: (person: Person) => void
  onAbsence: (person: Person) => void
  onForeman: (crew: Crew) => void
  onRename: (crew: Crew) => void
  onDissolve: (crew: Crew) => void
  onMakeForeman: (crew: Crew, person: Person) => void
  onRemove: (person: Person) => void
}

/** One crew with its people, or the people without a crew when `crew` is null. */
export function CrewPanel({
  crew,
  people,
  actions,
}: {
  crew: Crew | null
  people: Person[]
  actions: CrewActions
}) {
  const workspace = useWorkspace()
  const today = clock.today()
  const year = Number(today.slice(0, 4))
  const assignment = crew ? assignmentOn(crew.id, today, workspace.assignments) : undefined
  const work = workspace.works.find((item) => item.id === assignment?.workId)
  const foreman = workspace.people.find((p) => p.id === crew?.foremanId)
  const title = crew?.name ?? 'Sin cuadrilla'
  const sorted = [...people].sort(
    (a, b) =>
      Number(b.id === crew?.foremanId) - Number(a.id === crew?.foremanId) ||
      a.name.localeCompare(b.name, 'es'),
  )

  return (
    <Panel aria-labelledby={`crew-${crew?.id ?? 'none'}`}>
      <PanelHeader
        id={`crew-${crew?.id ?? 'none'}`}
        icon={<Users className="size-5" strokeWidth={1.75} />}
        title={title}
        description={
          crew
            ? `${foreman?.name ?? 'Sin capataz'} · ${pluralize(people.length, 'persona', 'personas')} · hoy: ${work ? work.title : 'libre'}`
            : 'Personas que todavía no están en ninguna cuadrilla.'
        }
        action={
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onPress={() => actions.onAdd(crew?.id ?? null)}>
              <Plus aria-hidden="true" className="size-4" /> Añadir
            </Button>
            {crew ? (
              <RowMenu label={`Acciones de ${crew.name}`}>
                <DropdownMenuItem onAction={() => actions.onRename(crew)}>
                  Renombrar
                </DropdownMenuItem>
                <DropdownMenuItem onAction={() => actions.onForeman(crew)}>
                  Cambiar de capataz
                </DropdownMenuItem>
                <DropdownMenuItem onAction={() => actions.onDissolve(crew)}>
                  Disolver cuadrilla
                </DropdownMenuItem>
              </RowMenu>
            ) : null}
          </div>
        }
      />
      {sorted.length === 0 ? (
        <p className="text-muted-foreground px-5 py-6 text-sm">
          {crew ? 'Cuadrilla vacía.' : 'Todos están en una cuadrilla.'}
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {sorted.map((person) => {
            const isForeman = person.id === crew?.foremanId
            const absence = absenceOn(person.id, today, workspace.absences)
            const left = vacationBalance(person.id, year, workspace.absences).remaining
            const chat = whatsappLink(person.phone, '')
            return (
              <li key={person.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
                <span
                  aria-hidden="true"
                  className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                >
                  {person.initials}
                </span>
                <span className="min-w-40 flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{person.name}</span>
                    {isForeman ? <Tag tone="green">{roleLabels.capataz}</Tag> : null}
                    {absence ? (
                      <Tag tone="amber" dot>
                        Fuera hoy
                      </Tag>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {person.phone || 'Sin teléfono'} · {formatNumber(left)} días de vacaciones
                  </span>
                </span>
                {isForeman && crew ? (
                  <Button variant="outline" size="sm" onPress={() => actions.onForeman(crew)}>
                    Cambiar de capataz
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onPress={() => actions.onMove(person)}>
                    Cambiar de cuadrilla
                  </Button>
                )}
                {chat ? (
                  <a
                    href={chat}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`WhatsApp a ${person.name}`}
                    className="focus-visible:outline-ring border-border hover:bg-muted touch-target inline-flex size-8 items-center justify-center rounded-md border focus-visible:outline-2"
                  >
                    <MessageCircle aria-hidden="true" className="size-4" />
                  </a>
                ) : null}
                <RowMenu label={`Acciones de ${person.name}`}>
                  <DropdownMenuItem onAction={() => actions.onAbsence(person)}>
                    Registrar baja o vacaciones
                  </DropdownMenuItem>
                  <DropdownMenuItem onAction={() => actions.onEdit(person)}>
                    Editar datos
                  </DropdownMenuItem>
                  {crew && !isForeman ? (
                    <DropdownMenuItem onAction={() => actions.onMakeForeman(crew, person)}>
                      Nombrar capataz
                    </DropdownMenuItem>
                  ) : null}
                  {crew && !isForeman ? (
                    <DropdownMenuItem onAction={() => actions.onRemove(person)}>
                      <UserRoundX aria-hidden="true" className="size-4" /> Quitar de la cuadrilla
                    </DropdownMenuItem>
                  ) : null}
                </RowMenu>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
