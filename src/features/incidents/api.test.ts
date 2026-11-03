import { describe, expect, it } from 'vitest'

import { createBudgetsApi } from '@/features/budgets/api'
import { incidentBudgetDraft } from '@/features/budgets/application/budget-draft'
import { createWorkspaceApi } from '@/features/workspace/api'
import type { ApiDeps } from '@/features/workspace/application/ports'
import { createLocalBackend } from '@/features/workspace/infrastructure/local-backend'
import { createMemoryStorage, removeKey } from '@/shared/lib/local-storage'

import { createIncidentsApi } from './api'

function setup(storage = createMemoryStorage()) {
  const backend = createLocalBackend(
    () => '2026-11-03',
    () => storage,
  )
  let sequence = 0
  const deps: ApiDeps = {
    repositories: backend.repositories,
    newId: () => `persisted-inc-${++sequence}`,
    today: () => '2026-11-03',
    now: () => '2026-11-03T12:00:00.000Z',
    currentUserId: () => backend.session.currentUserId(),
  }
  return {
    storage,
    incidents: createIncidentsApi(deps),
    budgets: createBudgetsApi(deps),
    workspace: createWorkspaceApi(deps, backend),
  }
}

describe('persisted incident workflow', () => {
  it('retains office creation, worker resolution and the linked estimate after reload', async () => {
    const api = setup()
    await api.workspace.ensureReady()
    const data = await api.workspace.getWorkspace()
    const admin = data.people.find((person) => person.role === 'admin')
    const worker = data.people.find((person) => person.role === 'peon')
    const client = data.clients[0]
    const zone = data.zones[0]
    if (!admin || !worker || !client || !zone) throw new Error('Missing incident test fixtures')
    await api.workspace.signIn(admin.id)
    const incident = await api.incidents.create({
      title: 'Aviso de prueba',
      description: 'Pino caído en la pista.',
      clientId: client.id,
      assignedTo: worker.id,
      priority: 'normal',
      location: 'Entrada',
      contactName: 'Contacto',
      contactPhone: '',
      preferredTime: 'Mañana',
    })
    await api.workspace.signIn(worker.id)
    await api.incidents.addVisit(incident.id, {
      date: '2026-11-03',
      text: 'Pista despejada',
      minutes: 30,
      material: 'Sin material',
    })
    await api.incidents.close(incident.id, 'Se retiró el pino.')
    await expect(
      api.budgets.saveFromIncident(incident.id, {
        ...incidentBudgetDraft(incident, '2026-11-03'),
        zoneId: zone.id,
      }),
    ).rejects.toThrow('Solo la oficina')
    await api.workspace.signIn(admin.id)
    const draft = { ...incidentBudgetDraft(incident, '2026-11-03'), zoneId: zone.id }
    const budget = await api.budgets.saveFromIncident(incident.id, draft)
    expect((await api.budgets.saveFromIncident(incident.id, draft)).id).toBe(budget.id)
    const reloaded = setup(api.storage)
    await reloaded.workspace.ensureReady()
    const saved = await reloaded.workspace.getWorkspace()
    expect(saved.incidents.find((item) => item.id === incident.id)).toMatchObject({
      status: 'cerrada',
      closedBy: worker.id,
      resolution: 'Se retiró el pino.',
      entries: [
        { kind: 'actuacion', minutes: 30, authorId: worker.id },
        { kind: 'cierre', authorId: worker.id },
      ],
    })
    expect(saved.budgets.find((item) => item.id === budget.id)?.incidentId).toBe(incident.id)
    expect(saved.clients).toEqual(data.clients)
    expect(saved.works).toEqual(data.works)
  })

  it('opens an older database without the incidents collection without resetting other data', async () => {
    const api = setup()
    await api.workspace.ensureReady()
    const before = await api.workspace.getWorkspace()
    removeKey(api.storage, 'db:incidents')
    const reloaded = setup(api.storage)
    await reloaded.workspace.ensureReady()
    const after = await reloaded.workspace.getWorkspace()
    expect(after.incidents).toEqual([])
    expect(after.clients).toEqual(before.clients)
    expect(after.budgets).toEqual(before.budgets)
    expect(after.works).toEqual(before.works)
  })

  it('does not mutate an incident without a signed-in user', async () => {
    const api = setup()
    await api.workspace.ensureReady()
    const before = await api.workspace.getWorkspace()
    const incident = before.incidents[0]
    if (!incident) throw new Error('Missing incident fixture')
    await expect(api.incidents.close(incident.id, 'Resuelto')).rejects.toThrow('Inicia sesión')
    expect((await api.workspace.getWorkspace()).incidents).toEqual(before.incidents)
  })
})
