import {
  addWorker,
  apiDeps,
  createCrew,
  dissolveCrew,
  moveWorker,
  mutate,
  renameCrew,
  setForeman,
  updateWorker,
  type ApiDeps,
  type Crew,
  type Person,
  type WorkerInput,
} from '@/features/workspace'

export type CrewsApi = {
  addWorker(input: WorkerInput & { crewId: string | null }): Promise<Person>
  updateWorker(personId: string, input: WorkerInput): Promise<void>
  /** `null` leaves the person without a crew. */
  moveWorker(personId: string, crewId: string | null): Promise<void>
  setForeman(crewId: string, personId: string): Promise<void>
  createCrew(input: { name: string; foremanId: string }): Promise<Crew>
  renameCrew(crewId: string, name: string): Promise<void>
  dissolveCrew(crewId: string): Promise<void>
}

export function createCrewsApi(deps: ApiDeps): CrewsApi {
  return {
    addWorker: (input) =>
      mutate(deps, (workspace, context) => {
        const { workspace: next, person } = addWorker(workspace, input, context)
        return { workspace: next, result: person }
      }),
    updateWorker: (personId, input) =>
      mutate(deps, (workspace) => ({
        workspace: updateWorker(workspace, personId, input),
        result: undefined,
      })),
    moveWorker: (personId, crewId) =>
      mutate(deps, (workspace, context) => ({
        workspace: moveWorker(workspace, personId, crewId, context),
        result: undefined,
      })),
    setForeman: (crewId, personId) =>
      mutate(deps, (workspace, context) => ({
        workspace: setForeman(workspace, crewId, personId, context),
        result: undefined,
      })),
    createCrew: (input) =>
      mutate(deps, (workspace, context) => {
        const { workspace: next, crew } = createCrew(workspace, input, context)
        return { workspace: next, result: crew }
      }),
    renameCrew: (crewId, name) =>
      mutate(deps, (workspace) => ({
        workspace: renameCrew(workspace, crewId, name),
        result: undefined,
      })),
    dissolveCrew: (crewId) =>
      mutate(deps, (workspace) => ({
        workspace: dissolveCrew(workspace, crewId),
        result: undefined,
      })),
  }
}

export const crewsApi = createCrewsApi(apiDeps)
