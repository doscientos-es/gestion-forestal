import { beforeEach, describe, expect, it } from 'vitest'

import { createBudgetsApi } from '@/features/budgets/api'
import { createInvoicesApi } from '@/features/invoices/api'
import { createPlanningApi } from '@/features/planning/api'
import { createWorksApi } from '@/features/works/api'
import { DomainError } from '@/shared/lib/errors'
import { createMemoryStorage } from '@/shared/lib/local-storage'

import { createWorkspaceApi } from './api'
import type { ApiDeps } from './application/ports'
import { createLocalBackend } from './infrastructure/local-backend'

const TODAY = '2026-11-04'

function setup() {
  const storage = createMemoryStorage()
  const backend = createLocalBackend(
    () => TODAY,
    () => storage,
  )
  let sequence = 0
  const deps: ApiDeps = {
    repositories: backend.repositories,
    newId: () => `new-${(sequence += 1)}`,
    today: () => TODAY,
    now: () => `${TODAY}T09:15:00.000Z`,
    currentUserId: () => backend.session.currentUserId(),
  }
  return {
    workspace: createWorkspaceApi(deps, backend),
    budgets: createBudgetsApi(deps),
    planning: createPlanningApi(deps),
    works: createWorksApi(deps),
    invoices: createInvoicesApi(deps),
  }
}

describe('api layer over the local backend', () => {
  let api: ReturnType<typeof setup>
  beforeEach(async () => {
    api = setup()
    await api.workspace.ensureReady()
  })

  it('seeds once and reads a consistent snapshot', async () => {
    const workspace = await api.workspace.getWorkspace()
    expect(workspace.works.length).toBeGreaterThan(20)
    expect(workspace.people.some((person) => person.role === 'admin')).toBe(true)
    await api.workspace.ensureReady()
    expect((await api.workspace.getWorkspace()).works).toHaveLength(workspace.works.length)
  })

  it('persists an accepted budget as a new work and links both ways', async () => {
    const before = await api.workspace.getWorkspace()
    const source = before.budgets.find((budget) => budget.status === 'borrador')
    if (!source) throw new Error('missing draft budget')
    const work = await api.budgets.accept(source.id)
    const after = await api.workspace.getWorkspace()
    expect(after.works).toHaveLength(before.works.length + 1)
    expect(after.budgets.find((budget) => budget.id === source.id)).toMatchObject({
      status: 'aceptado',
      workId: work.id,
    })
    await expect(api.budgets.accept(source.id)).rejects.toBeInstanceOf(DomainError)
  })

  it('only rewrites entities that changed', async () => {
    const before = await api.workspace.getWorkspace()
    const pending = before.works.find((work) => work.status === 'pendiente')
    if (!pending) throw new Error('missing pending work')
    await api.planning.assign({
      workId: pending.id,
      crewId: 'cr-sur',
      start: '2026-11-16',
      end: '2026-11-20',
    })
    const after = await api.workspace.getWorkspace()
    expect(after.assignments).toHaveLength(before.assignments.length + 1)
    expect(after.works.find((work) => work.id === pending.id)?.status).toBe('planificada')
    expect(after.reports).toEqual(before.reports)
  })

  it('exports drafts for the accounting office and marks them as sent', async () => {
    const workspace = await api.workspace.getWorkspace()
    const finished = workspace.works.find((work) => work.status === 'terminada')
    if (!finished) throw new Error('missing finished work')
    const draft = await api.works.createInvoiceDraft(finished.id)
    const file = await api.invoices.sendToAccounting([draft.id])
    expect(file.filename).toBe(`facturas-gestoria-${TODAY}.csv`)
    expect(file.csv.split('\n')).toHaveLength(2)
    const stored = (await api.workspace.getWorkspace()).invoices.find(
      (item) => item.id === draft.id,
    )
    expect(stored?.status).toBe('enviada')
  })

  it('attributes activity to the signed-in person and persists client views', async () => {
    const before = await api.workspace.getWorkspace()
    const admin = before.people.find((person) => person.role === 'admin')
    const draft = before.budgets.find((budget) => budget.status === 'borrador')
    if (!admin || !draft) throw new Error('missing admin or draft budget')
    await api.workspace.signIn(admin.id)
    await api.budgets.sendEmail(draft.id, {
      to: 'cliente@example.org',
      subject: 'Propuesta',
      message: '',
    })
    await api.budgets.recordView(draft.id)
    const after = await api.workspace.getWorkspace()
    expect(after.activity[0]).toMatchObject({ kind: 'presupuesto_visto', actorId: null })
    expect(after.activity[1]).toMatchObject({ kind: 'presupuesto_enviado', actorId: admin.id })
    expect(after.budgets.find((budget) => budget.id === draft.id)?.status).toBe('enviado')
  })

  it('restores the seed on reset and handles the session', async () => {
    const [admin] = (await api.workspace.getWorkspace()).people
    if (!admin) throw new Error('missing person')
    await api.workspace.signIn(admin.id)
    expect((await api.workspace.getCurrentUser())?.id).toBe(admin.id)
    const draft = (await api.workspace.getWorkspace()).budgets[0]
    if (!draft) throw new Error('missing budget')
    await api.budgets.setStatus(draft.id, 'rechazado')
    await api.workspace.resetDemo()
    const restored = (await api.workspace.getWorkspace()).budgets.find(
      (budget) => budget.id === draft.id,
    )
    expect(restored?.status).toBe(draft.status)
    await api.workspace.signOut()
    expect(await api.workspace.getCurrentUser()).toBeNull()
  })
})
