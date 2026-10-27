import {
  apiDeps,
  createInvoiceDraft,
  finishWork,
  mutate,
  recordWorkReportView,
  sendWorkReportEmail,
  type ApiDeps,
  type EmailInput,
  type InvoiceDraft,
} from '@/features/workspace'

export type WorksApi = {
  finish(workId: string): Promise<void>
  /** Simulated: records that the client report was emailed. No email leaves the app. */
  sendReportEmail(workId: string, email: EmailInput): Promise<void>
  /** The client opened the public report link. */
  recordReportView(workId: string): Promise<void>
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
    sendReportEmail: (workId, email) =>
      mutate(deps, (workspace, context) => ({
        workspace: sendWorkReportEmail(workspace, workId, email, context),
        result: undefined,
      })),
    recordReportView: (workId) =>
      mutate(deps, (workspace, context) => ({
        workspace: recordWorkReportView(workspace, workId, { ...context, actorId: null }),
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
