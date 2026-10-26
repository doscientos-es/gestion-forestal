import {
  apiDeps,
  commandContext,
  decideAbsence,
  mutate,
  requestAbsence,
  type Absence,
  type ApiDeps,
} from '@/features/workspace'

export type AbsenceRequest = Pick<Absence, 'personId' | 'type' | 'start' | 'end' | 'note'>

export type AbsencesApi = {
  /** `approved` is true when the office registers the absence directly. */
  request(input: AbsenceRequest, approved: boolean): Promise<void>
  decide(absenceId: string, status: 'aprobada' | 'rechazada'): Promise<void>
}

export function createAbsencesApi(deps: ApiDeps): AbsencesApi {
  return {
    request: (input, approved) =>
      mutate(deps, (workspace) => ({
        workspace: requestAbsence(workspace, input, commandContext(deps), approved),
        result: undefined,
      })),
    decide: (absenceId, status) =>
      mutate(deps, (workspace) => ({
        workspace: decideAbsence(workspace, absenceId, status, commandContext(deps)),
        result: undefined,
      })),
  }
}

export const absencesApi = createAbsencesApi(apiDeps)
