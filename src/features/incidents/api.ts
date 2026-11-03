import {
  addIncidentVisit,
  apiDeps,
  assignServiceIncident,
  closeServiceIncident,
  createServiceIncident,
  mutate,
  reopenServiceIncident,
  type ApiDeps,
  type IncidentVisitInput,
  type ServiceIncidentInput,
} from '@/features/workspace'

export function createIncidentsApi(deps: ApiDeps) {
  return {
    create: (input: ServiceIncidentInput) =>
      mutate(deps, (workspace, context) => {
        const created = createServiceIncident(workspace, input, context)
        return { workspace: created.workspace, result: created.incident }
      }),
    addVisit: (id: string, input: IncidentVisitInput) =>
      mutate(deps, (workspace, context) => ({
        workspace: addIncidentVisit(workspace, id, input, context),
        result: undefined,
      })),
    close: (id: string, resolution: string) =>
      mutate(deps, (workspace, context) => ({
        workspace: closeServiceIncident(workspace, id, resolution, context),
        result: undefined,
      })),
    reopen: (id: string) =>
      mutate(deps, (workspace, context) => ({
        workspace: reopenServiceIncident(workspace, id, context),
        result: undefined,
      })),
    assign: (id: string, assignedTo: string | null) =>
      mutate(deps, (workspace, context) => ({
        workspace: assignServiceIncident(workspace, id, assignedTo, context),
        result: undefined,
      })),
  }
}

export const incidentsApi = createIncidentsApi(apiDeps)
