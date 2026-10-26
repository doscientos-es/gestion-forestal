import {
  apiDeps,
  commandContext,
  moveAssignment,
  mutate,
  removeAssignment,
  scheduleWork,
  type ApiDeps,
  type Assignment,
  type ScheduleInput,
} from '@/features/workspace'

export type PlanningApi = {
  /** Assigns a work to a crew; the crew is notified and receives the optional checklist. */
  assign(input: ScheduleInput): Promise<void>
  move(assignmentId: string, patch: Pick<Assignment, 'crewId' | 'start' | 'end'>): Promise<void>
  unassign(assignmentId: string): Promise<void>
}

export function createPlanningApi(deps: ApiDeps): PlanningApi {
  return {
    assign: (input) =>
      mutate(deps, (workspace) => ({
        workspace: scheduleWork(workspace, input, commandContext(deps)),
        result: undefined,
      })),
    move: (assignmentId, patch) =>
      mutate(deps, (workspace) => ({
        workspace: moveAssignment(workspace, assignmentId, patch, commandContext(deps)),
        result: undefined,
      })),
    unassign: (assignmentId) =>
      mutate(deps, (workspace) => ({
        workspace: removeAssignment(workspace, assignmentId, commandContext(deps)),
        result: undefined,
      })),
  }
}

export const planningApi = createPlanningApi(apiDeps)
