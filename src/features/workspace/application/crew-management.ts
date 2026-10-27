import { CommandError, notify, type Context } from './commands'
import type { Cents, Crew, Person, Workspace } from './model'

export type WorkerInput = { name: string; phone: string; email: string; dailyCost: Cents }

const TONES: Crew['tone'][] = ['green', 'blue', 'amber']

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
const foremanTitle = (crew: Pick<Crew, 'name'>) => `Capataz · ${crew.name}`
const WORKER_TITLE = 'Peón forestal'

function validateWorker(workspace: Workspace, input: WorkerInput, personId?: string) {
  if (!input.name.trim()) throw new CommandError('Escribe el nombre de la persona.')
  if (workspace.people.some((p) => p.id !== personId && sameText(p.name, input.name)))
    throw new CommandError('Ya hay una persona con ese nombre.')
  if (!(input.dailyCost > 0)) throw new CommandError('El coste de la peonada debe ser mayor que 0.')
  if (input.email.trim() && !/^\S+@\S+\.\S+$/.test(input.email.trim()))
    throw new CommandError('El correo no es válido.')
}

function mapPerson(workspace: Workspace, personId: string, patch: Partial<Person>): Workspace {
  return {
    ...workspace,
    people: workspace.people.map((p) => (p.id === personId ? { ...p, ...patch } : p)),
  }
}

function requirePerson(workspace: Workspace, personId: string) {
  const person = workspace.people.find((item) => item.id === personId)
  if (!person) throw new CommandError('Persona no encontrada.')
  if (person.role === 'admin')
    throw new CommandError('La administración no forma parte de una cuadrilla.')
  return person
}

function requireCrew(workspace: Workspace, crewId: string) {
  const crew = workspace.crews.find((item) => item.id === crewId)
  if (!crew) throw new CommandError('Cuadrilla no encontrada.')
  return crew
}

/** Adds a worker, straight into a crew or unassigned. */
export function addWorker(
  workspace: Workspace,
  input: WorkerInput & { crewId: string | null },
  context: Context,
): { workspace: Workspace; person: Person } {
  validateWorker(workspace, input)
  const crew = input.crewId ? requireCrew(workspace, input.crewId) : null
  const person: Person = {
    id: context.id(),
    name: input.name.trim(),
    initials: initialsOf(input.name),
    role: 'peon',
    title: WORKER_TITLE,
    email: input.email.trim(),
    phone: input.phone.trim(),
    crewId: crew?.id ?? null,
    dailyCost: input.dailyCost,
  }
  const next = { ...workspace, people: [...workspace.people, person] }
  return { person, workspace: crew ? notifyMove(next, person, crew, context) : next }
}

export function updateWorker(workspace: Workspace, personId: string, input: WorkerInput) {
  const person = requirePerson(workspace, personId)
  validateWorker(workspace, input, personId)
  return mapPerson(workspace, personId, {
    name: input.name.trim(),
    initials: initialsOf(input.name),
    email: input.email.trim(),
    phone: input.phone.trim(),
    dailyCost: input.dailyCost,
    title: person.title,
  })
}

function notifyMove(workspace: Workspace, person: Person, crew: Crew | null, context: Context) {
  return notify(
    workspace,
    [person.id],
    {
      kind: 'cuadrilla_cambiada',
      title: crew ? `Ahora estás en ${crew.name}` : 'Ya no estás en ninguna cuadrilla',
      body: crew ? 'La oficina te ha asignado a esta cuadrilla.' : 'La oficina te avisará.',
      workId: null,
    },
    context,
  )
}

/** Moves a worker to another crew, or out of every crew. A foreman must be replaced first. */
export function moveWorker(
  workspace: Workspace,
  personId: string,
  crewId: string | null,
  context: Context,
): Workspace {
  const person = requirePerson(workspace, personId)
  if (person.crewId === crewId) return workspace
  const current = workspace.crews.find((crew) => crew.id === person.crewId)
  if (current?.foremanId === person.id)
    throw new CommandError(
      `${person.name} es el capataz de ${current.name}. Nombra antes a otra persona.`,
    )
  const target = crewId ? requireCrew(workspace, crewId) : null
  return notifyMove(
    mapPerson(workspace, personId, { crewId: target?.id ?? null }),
    person,
    target,
    context,
  )
}

/** Makes a member of the crew its foreman; the previous foreman goes back to being a worker. */
export function setForeman(
  workspace: Workspace,
  crewId: string,
  personId: string,
  context: Context,
): Workspace {
  const crew = requireCrew(workspace, crewId)
  const person = requirePerson(workspace, personId)
  if (person.crewId !== crew.id) throw new CommandError('Esa persona no está en la cuadrilla.')
  if (crew.foremanId === person.id) return workspace
  let next = mapPerson(workspace, crew.foremanId, { role: 'peon', title: WORKER_TITLE })
  next = mapPerson(next, person.id, { role: 'capataz', title: foremanTitle(crew) })
  next = {
    ...next,
    crews: next.crews.map((c) => (c.id === crew.id ? { ...c, foremanId: person.id } : c)),
  }
  return notify(
    next,
    [person.id],
    {
      kind: 'cuadrilla_cambiada',
      title: `Eres el capataz de ${crew.name}`,
      body: 'Rellenarás el parte diario.',
      workId: null,
    },
    context,
  )
}

/** A new crew needs a foreman: the chosen person moves into it. */
export function createCrew(
  workspace: Workspace,
  input: { name: string; foremanId: string },
  context: Context,
): { workspace: Workspace; crew: Crew } {
  const name = input.name.trim()
  if (!name) throw new CommandError('Escribe el nombre de la cuadrilla.')
  if (workspace.crews.some((crew) => sameText(crew.name, name)))
    throw new CommandError('Ya existe una cuadrilla con ese nombre.')
  const person = requirePerson(workspace, input.foremanId)
  if (workspace.crews.some((crew) => crew.foremanId === person.id))
    throw new CommandError(`${person.name} ya es capataz de otra cuadrilla.`)
  const crew: Crew = {
    id: context.id(),
    name,
    foremanId: person.id,
    tone: TONES[workspace.crews.length % TONES.length] ?? 'green',
  }
  const next = mapPerson({ ...workspace, crews: [...workspace.crews, crew] }, person.id, {
    crewId: crew.id,
    role: 'capataz',
    title: foremanTitle(crew),
  })
  return { crew, workspace: notifyMove(next, person, crew, context) }
}

export function renameCrew(workspace: Workspace, crewId: string, name: string): Workspace {
  const crew = requireCrew(workspace, crewId)
  const clean = name.trim()
  if (!clean) throw new CommandError('Escribe el nombre de la cuadrilla.')
  if (workspace.crews.some((item) => item.id !== crewId && sameText(item.name, clean)))
    throw new CommandError('Ya existe una cuadrilla con ese nombre.')
  const renamed = { ...crew, name: clean }
  return mapPerson(
    { ...workspace, crews: workspace.crews.map((c) => (c.id === crewId ? renamed : c)) },
    crew.foremanId,
    { title: foremanTitle(renamed) },
  )
}

/** Dissolves a crew: everyone is left unassigned. Crews with planning history are kept. */
export function dissolveCrew(workspace: Workspace, crewId: string): Workspace {
  const crew = requireCrew(workspace, crewId)
  if (workspace.assignments.some((item) => item.crewId === crewId))
    throw new CommandError(
      `${crew.name} tiene obras en la planificación o en el histórico: no se puede disolver.`,
    )
  return {
    ...workspace,
    crews: workspace.crews.filter((item) => item.id !== crewId),
    people: workspace.people.map((p) =>
      p.crewId !== crewId
        ? p
        : {
            ...p,
            crewId: null,
            ...(p.id === crew.foremanId ? { role: 'peon' as const, title: WORKER_TITLE } : {}),
          },
    ),
  }
}
