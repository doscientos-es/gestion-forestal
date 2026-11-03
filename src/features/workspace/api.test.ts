import { beforeEach, describe, expect, it } from 'vitest'

import { createBudgetsApi } from '@/features/budgets/api'
import {
  draftFromBudget,
  newFreeLine,
  updateLine,
} from '@/features/budgets/application/budget-draft'
import { createClientsApi } from '@/features/clients/api'
import { createDailyReportApi } from '@/features/daily-report/api'
import { createInvoicesApi } from '@/features/invoices/api'
import { createPlanningApi } from '@/features/planning/api'
import { createWorksApi } from '@/features/works/api'
import { writeCollection } from '@/shared/data/database'
import { parseCsv } from '@/shared/lib/csv'
import { DomainError } from '@/shared/lib/errors'
import { createMemoryStorage } from '@/shared/lib/local-storage'

import { createWorkspaceApi } from './api'
import { invoiceTotals } from './application/invoice-draft'
import type { ApiDeps } from './application/ports'
import { createLocalBackend } from './infrastructure/local-backend'

const TODAY = '2026-11-04'

function setup(storage = createMemoryStorage()) {
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
    storage,
    reports: createDailyReportApi(deps),
    clients: createClientsApi(deps),
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

  it('persists the same complete client from both entry points, edits and reloads it', async () => {
    const client = await api.budgets.createClient({
      name: 'Finca de prueba',
      kind: 'particular',
      taxId: '12345678Z',
      town: 'Monte Alto',
      legalName: 'Elena del Bosque García',
      contactName: 'Elena',
      email: 'elena@example.org',
      billingAddress: {
        street: 'Calle Mayor, 5',
        postalCode: '01001',
        city: 'Vitoria-Gasteiz',
        province: 'Álava',
        country: 'España',
      },
    })
    const reloaded = setup(api.storage)
    await reloaded.workspace.ensureReady()
    expect(
      (await reloaded.workspace.getWorkspace()).clients.find((item) => item.id === client.id),
    ).toEqual(client)
    const saved = await reloaded.clients.update(client.id, {
      ...client,
      legalName: 'Elena del Bosque López',
      billingAddress: { street: 'Calle Nueva, 8' },
    })
    expect(saved).toEqual({
      ...client,
      legalName: 'Elena del Bosque López',
      billingAddress: { ...client.billingAddress, street: 'Calle Nueva, 8' },
    })
    expect(
      (await api.workspace.getWorkspace()).clients.find((item) => item.id === client.id),
    ).toEqual(saved)
  })

  it('upgrades existing clients without resetting related work or replacing known fiscal data', async () => {
    const before = await api.workspace.getWorkspace()
    const source = before.clients[0]
    if (!source) throw new Error('Missing seed client')
    const { legalName: _legal, contactName: _contact, billingAddress: _address, ...legacy } = source
    writeCollection(
      'clients',
      [{ ...legacy, name: 'Nombre editado antes de actualizar' }, ...before.clients.slice(1)],
      api.storage,
    )
    const reloaded = setup(api.storage)
    await reloaded.workspace.ensureReady()
    await reloaded.workspace.ensureReady()
    const after = await reloaded.workspace.getWorkspace()
    expect(after.clients[0]).toMatchObject({
      id: source.id,
      name: 'Nombre editado antes de actualizar',
      legalName: 'Nombre editado antes de actualizar',
      billingAddress: { street: '', postalCode: '', city: '', province: '', country: 'España' },
    })
    expect(after.clients.slice(1)).toEqual(before.clients.slice(1))
    expect(after.works).toEqual(before.works)
    expect(after.budgets).toEqual(before.budgets)
    expect(after.invoices).toEqual(before.invoices)
  })

  it('rejects an incomplete accounting batch without marking any drafts as sent', async () => {
    const before = await api.workspace.getWorkspace()
    const invoice = before.invoices[0]
    const client = before.clients.find((item) => item.id === invoice?.clientId)
    if (!invoice || !client) throw new Error('Missing seed invoice/client')
    await api.clients.update(client.id, { ...client, billingAddress: { street: '' } })
    await expect(
      api.invoices.sendToAccounting(before.invoices.map((item) => item.id)),
    ).rejects.toThrow('dirección')
    const after = await api.workspace.getWorkspace()
    expect(after.invoices).toEqual(before.invoices)
    expect(after.activity).toEqual(before.activity)
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

  it('persists, reloads and edits free-only budgets, then invoices the exact accepted price', async () => {
    const source = (await api.workspace.getWorkspace()).budgets[0]
    if (!source) throw new Error('Missing fixture budget')
    const free = {
      ...newFreeLine(),
      description: 'Alquiler',
      quantity: 2.5,
      unit: 'h',
      unitPrice: 1234,
      unitCost: 450,
    }
    const input = { ...draftFromBudget(source), title: 'Servicio a medida', lines: [free] }
    const saved = await api.budgets.save(input)
    const reloaded = setup(api.storage)
    await reloaded.workspace.ensureReady()
    expect(
      (await reloaded.workspace.getWorkspace()).budgets.find((item) => item.id === saved.id)?.lines,
    ).toEqual([free])
    const changed = updateLine(input.lines, free.id, { quantity: 3.5 })
    await api.budgets.save({ ...input, lines: changed }, saved.id)
    expect(
      (await reloaded.workspace.getWorkspace()).budgets.find((item) => item.id === saved.id)?.lines,
    ).toEqual([{ ...free, quantity: 3.5 }])
    const accepted = await api.budgets.accept(saved.id)
    expect(accepted.planned).toMatchObject({
      price: 4319,
      otherCost: 1575,
      totalCost: 1575,
      crewDays: 0,
    })
    await api.works.finish(accepted.id)
    const invoice = await api.works.createInvoiceDraft(accepted.id)
    expect(invoiceTotals(invoice)).toEqual({ base: 4319, vat: 907, total: 5226 })
    await expect(api.works.createInvoiceDraft(accepted.id)).rejects.toBeInstanceOf(DomainError)
    expect(
      (await reloaded.workspace.getWorkspace()).works.find((item) => item.id === accepted.id)
        ?.planned,
    ).toEqual(accepted.planned)
  })

  it('persists individual scores across reloads and edits without duplicating the report', async () => {
    const before = await api.workspace.getWorkspace()
    const work = before.works.find((item) => item.status === 'en_curso')
    if (!work) throw new Error('Missing fixture work')
    const input = {
      workId: work.id,
      crewId: 'cr-sur',
      date: TODAY,
      workerIds: ['p-javier', 'p-mikel'],
      workerRatings: { 'p-javier': 8, 'p-mikel': 6 },
      plants: 300,
      hectares: 1,
      incident: 'ninguna' as const,
      notes: '',
      photos: [],
      authorId: 'p-javier',
    }
    await api.reports.submit(input)
    const reloaded = setup(api.storage)
    await reloaded.workspace.ensureReady()
    const stored = (await reloaded.workspace.getWorkspace()).reports.find(
      (item) => item.workId === work.id && item.crewId === input.crewId && item.date === TODAY,
    )
    expect(stored?.workerRatings).toEqual(input.workerRatings)
    await expect(reloaded.reports.submit({ ...input, workerRatings: {} })).rejects.toBeInstanceOf(
      DomainError,
    )
    await reloaded.reports.submit({
      ...input,
      workerIds: ['p-javier'],
      workerRatings: { 'p-javier': 9 },
    })
    const after = (await api.workspace.getWorkspace()).reports.filter(
      (item) => item.workId === work.id && item.crewId === input.crewId && item.date === TODAY,
    )
    expect(after).toHaveLength(1)
    expect(after[0]).toMatchObject({ id: stored?.id, workerRatings: { 'p-javier': 9 } })
  })

  it('exports drafts for the accounting office and marks them as sent', async () => {
    const workspace = await api.workspace.getWorkspace()
    const finished = workspace.works.find((work) => work.status === 'terminada')
    if (!finished) throw new Error('missing finished work')
    const draft = await api.works.createInvoiceDraft(finished.id)
    const file = await api.invoices.sendToAccounting([draft.id])
    expect(file.filename).toBe(`facturas-gestoria-${TODAY}.csv`)
    expect(file.csv.split('\n')).toHaveLength(2)
    const [header, row] = parseCsv(file.csv)
    const recipient = workspace.clients.find((item) => item.id === draft.clientId)
    expect(row?.[header?.indexOf('Cliente') ?? -1]).toBe(recipient?.legalName)
    expect(row?.[header?.indexOf('Dirección de facturación') ?? -1]).toBe(
      recipient?.billingAddress.street,
    )
    expect(row?.[header?.indexOf('Código postal') ?? -1]).toBe(recipient?.billingAddress.postalCode)
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
