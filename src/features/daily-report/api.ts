import {
  apiDeps,
  commandContext,
  mutate,
  submitReport,
  type ApiDeps,
  type ReportInput,
} from '@/features/workspace'

export type DailyReportApi = {
  /** Creates the day's report or replaces the one already sent for that crew and work. */
  submit(input: ReportInput): Promise<void>
}

export function createDailyReportApi(deps: ApiDeps): DailyReportApi {
  return {
    submit: (input) =>
      mutate(deps, (workspace) => ({
        workspace: submitReport(workspace, input, commandContext(deps)),
        result: undefined,
      })),
  }
}

export const dailyReportApi = createDailyReportApi(apiDeps)
