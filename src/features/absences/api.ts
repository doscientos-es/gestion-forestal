import {
  apiDeps,
  cancelAbsence,
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
  /** Removes an absence (registered by mistake, or no longer needed). */
  cancel(absenceId: string): Promise<void>
}

export function createAbsencesApi(deps: ApiDeps): AbsencesApi {
  return {
    request: (input, approved) =>
      mutate(deps, (workspace, context) => ({
        workspace: requestAbsence(workspace, input, context, approved),
        result: undefined,
      })),
    decide: (absenceId, status) =>
      mutate(deps, (workspace, context) => ({
        workspace: decideAbsence(workspace, absenceId, status, context),
        result: undefined,
      })),
    cancel: (absenceId) =>
      mutate(deps, (workspace, context) => ({
        workspace: cancelAbsence(workspace, absenceId, context),
        result: undefined,
      })),
  }
}

export const absencesApi = createAbsencesApi(apiDeps)
