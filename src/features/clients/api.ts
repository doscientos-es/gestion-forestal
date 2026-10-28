import {
  apiDeps,
  createClient,
  mutate,
  updateClient,
  type ApiDeps,
  type Client,
  type ClientInput,
} from '@/features/workspace'

export type ClientsApi = {
  create(input: ClientInput): Promise<Client>
  update(clientId: string, input: ClientInput): Promise<void>
}

export function createClientsApi(deps: ApiDeps): ClientsApi {
  return {
    create: (input) =>
      mutate(deps, (workspace, context) => {
        const { workspace: next, client } = createClient(workspace, input, context)
        return { workspace: next, result: client }
      }),
    update: (clientId, input) =>
      mutate(deps, (workspace) => ({
        workspace: updateClient(workspace, clientId, input),
        result: undefined,
      })),
  }
}

export const clientsApi = createClientsApi(apiDeps)
