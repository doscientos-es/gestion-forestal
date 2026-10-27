import {
  apiDeps,
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
      mutate(deps, (workspace, context) => ({
        workspace: finishWork(workspace, workId, context),
        result: undefined,
      })),
    createInvoiceDraft: (workId) =>
      mutate(deps, (workspace, context) => {
        const { workspace: next, invoice } = createInvoiceDraft(workspace, workId, context)
        return { workspace: next, result: invoice }
      }),
  }
}

export const worksApi = createWorksApi(apiDeps)
