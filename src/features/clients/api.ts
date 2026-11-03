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
  update(clientId: string, input: ClientInput): Promise<Client>
}

export function createClientsApi(deps: ApiDeps): ClientsApi {
  return {
    create: (input) =>
      mutate(deps, (workspace, context) => {
        const { workspace: next, client } = createClient(workspace, input, context)
        return { workspace: next, result: client }
      }),
    update: (clientId, input) =>
      mutate(deps, (workspace) => {
        const next = updateClient(workspace, clientId, input)
        const client = next.clients.find((item) => item.id === clientId)
        if (!client) throw new Error('Updated client not found')
        return { workspace: next, result: client }
      }),
  }
}

export const clientsApi = createClientsApi(apiDeps)
