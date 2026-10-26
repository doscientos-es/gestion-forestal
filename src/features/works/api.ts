import {
  apiDeps,
  commandContext,
  createInvoiceDraft,
  finishWork,
  mutate,
  type ApiDeps,
  type InvoiceDraft,
} from '@/features/workspace'

export type WorksApi = {
  finish(workId: string): Promise<void>
  /** Creates the next progress or final invoice draft for the work. */
  createInvoiceDraft(workId: string): Promise<InvoiceDraft>
}

export function createWorksApi(deps: ApiDeps): WorksApi {
  return {
    finish: (workId) =>
      mutate(deps, (workspace) => ({
        workspace: finishWork(workspace, workId, commandContext(deps)),
        result: undefined,
      })),
    createInvoiceDraft: (workId) =>
      mutate(deps, (workspace) => {
        const { workspace: next, invoice } = createInvoiceDraft(
          workspace,
          workId,
          commandContext(deps),
        )
        return { workspace: next, result: invoice }
      }),
  }
}

export const worksApi = createWorksApi(apiDeps)
