import {
  addTask,
  addTasks,
  apiDeps,
  commandContext,
  markNotificationsRead,
  mutate,
  removeTask,
  setTaskDone,
  type ApiDeps,
} from '@/features/workspace'

export type TasksApi = {
  /** Office adds a task to a work and the assigned crew is notified. */
  add(workId: string, text: string): Promise<void>
  /** Several tasks with a single notice to the crew. */
  addMany(workId: string, texts: string[]): Promise<void>
  remove(taskId: string): Promise<void>
  /** A crew member ticks or unticks a task. */
  setDone(taskId: string, personId: string, done: boolean): Promise<void>
  markRead(personId: string, ids?: string[]): Promise<void>
}

export function createTasksApi(deps: ApiDeps): TasksApi {
  return {
    add: (workId, text) =>
      mutate(deps, (workspace) => ({
        workspace: addTask(workspace, workId, text, commandContext(deps)),
        result: undefined,
      })),
    addMany: (workId, texts) =>
      mutate(deps, (workspace) => ({
        workspace: addTasks(workspace, workId, texts, commandContext(deps)),
        result: undefined,
      })),
    remove: (taskId) =>
      mutate(deps, (workspace) => ({
        workspace: removeTask(workspace, taskId),
        result: undefined,
      })),
    setDone: (taskId, personId, done) =>
      mutate(deps, (workspace) => ({
        workspace: setTaskDone(workspace, taskId, personId, done, commandContext(deps)),
        result: undefined,
      })),
    markRead: (personId, ids) =>
      mutate(deps, (workspace) => ({
        workspace: markNotificationsRead(workspace, personId, ids),
        result: undefined,
      })),
  }
}

export const tasksApi = createTasksApi(apiDeps)
