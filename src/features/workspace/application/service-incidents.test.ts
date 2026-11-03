import { describe, expect, it } from 'vitest'

import { incidentBudgetDraft } from '@/features/budgets/application/budget-draft'

import { buildSeed } from '../infrastructure/build-seed'
import { saveBudget, type Context } from './commands'
import type { Role, ServiceIncidentInput } from './model'
import {
  addIncidentVisit,
  assignServiceIncident,
  budgetFromIncident,
  canManageIncident,
  closeServiceIncident,
  createServiceIncident,
  reopenServiceIncident,
  visibleIncidents,
} from './service-incidents'

const base = { ...buildSeed('2026-11-03'), incidents: [] }
const client = base.clients[0]
const otherClient = base.clients[1]
const zone = base.zones[0]
if (!client || !otherClient || !zone) throw new Error('Missing incident test fixtures')
const person = (role: Role) => {
  const actor = base.people.find((item) => item.role === role)
  if (!actor) throw new Error(`Missing ${role} fixture`)
  return actor
}
let sequence = 0
const context = (role: Role): Context => ({
  actorId: person(role).id,
  today: '2026-11-03',
  now: '2026-11-03T10:00:00.000Z',
  id: () => `new-incident-${++sequence}`,
})
const input: ServiceIncidentInput = {
  clientId: client.id,
  title: ' Árbol caído ',
  description: ' Obstruye la entrada. ',
  location: ' Pista principal ',
  contactName: ' Contacto ',
  contactPhone: '+34600000000',
  preferredTime: ' Por la tarde ',
  priority: 'alta',
  assignedTo: person('capataz').id,
}
const visit = {
  date: '2026-11-03',
  text: ' Retirado el árbol ',
  minutes: 90,
  material: ' Cadena de motosierra ',
}

describe('customer incidents', () => {
  it.each(['admin', 'capataz', 'peon'] as const)(
    'allows %s to create and close an incident linked to a real client',
    (role) => {
      const ctx = context(role)
      const created = createServiceIncident(base, input, ctx)
      expect(created.incident).toMatchObject({
        clientId: client.id,
        title: 'Árbol caído',
        description: 'Obstruye la entrada.',
        status: 'abierta',
        createdBy: ctx.actorId,
        assignedTo: role === 'admin' ? input.assignedTo : ctx.actorId,
      })
      const next = closeServiceIncident(
        created.workspace,
        created.incident.id,
        ' Retirada y acceso libre. ',
        ctx,
      )
      expect(next.incidents[0]).toMatchObject({
        status: 'cerrada',
        resolution: 'Retirada y acceso libre.',
        closedBy: ctx.actorId,
        closedAt: ctx.now,
      })
      expect(next.incidents[0]?.entries.at(-1)).toMatchObject({
        kind: 'cierre',
        authorId: ctx.actorId,
      })
      expect(base.incidents).toHaveLength(0)
      expect(created.incident.status).toBe('abierta')
    },
  )

  it('lets the assigned worker resolve an office request but keeps unrelated workers out', () => {
    const { workspace, incident } = createServiceIncident(base, input, context('admin'))
    expect(canManageIncident(incident, person('capataz'))).toBe(true)
    expect(visibleIncidents(workspace, person('peon'))).toHaveLength(0)
    expect(() => closeServiceIncident(workspace, incident.id, 'Resuelto', context('peon'))).toThrow(
      'sin permiso',
    )
    expect(
      closeServiceIncident(workspace, incident.id, 'Resuelto', context('capataz')).incidents[0]
        ?.status,
    ).toBe('cerrada')
  })

  it('attributes visits to the session actor and keeps time and material in order', () => {
    const { workspace, incident } = createServiceIncident(base, input, context('admin'))
    const ctx = context('capataz')
    const next = addIncidentVisit(workspace, incident.id, visit, ctx)
    expect(next.incidents[0]).toMatchObject({
      status: 'en_curso',
      entries: [
        {
          kind: 'actuacion',
          date: visit.date,
          authorId: ctx.actorId,
          text: 'Retirado el árbol',
          minutes: 90,
          material: 'Cadena de motosierra',
        },
      ],
    })
    expect(incident.entries).toHaveLength(0)
  })

  it('requires a resolution and preserves closure history when reopened', () => {
    const ctx = context('capataz')
    const { workspace, incident } = createServiceIncident(base, input, ctx)
    expect(() => closeServiceIncident(workspace, incident.id, ' ', ctx)).toThrow('solución')
    const closed = closeServiceIncident(workspace, incident.id, 'Resuelto', ctx)
    expect(() => addIncidentVisit(closed, incident.id, visit, ctx)).toThrow('Reabre')
    expect(() => closeServiceIncident(closed, incident.id, 'Otra vez', ctx)).toThrow(
      'ya está cerrada',
    )
    const reopened = reopenServiceIncident(closed, incident.id, ctx)
    expect(reopened.incidents[0]).toMatchObject({
      status: 'abierta',
      closedAt: null,
      closedBy: null,
      resolution: '',
    })
    expect(reopened.incidents[0]?.entries.map((item) => item.kind)).toEqual([
      'cierre',
      'reapertura',
    ])
    expect(reopened.incidents[0]?.entries[0]?.text).toBe('Resuelto')
  })

  it('only allows the office to reassign and records the change', () => {
    const ctx = context('admin')
    const { workspace, incident } = createServiceIncident(base, input, ctx)
    expect(() =>
      assignServiceIncident(workspace, incident.id, person('peon').id, context('capataz')),
    ).toThrow('Solo la oficina')
    expect(() => assignServiceIncident(workspace, incident.id, 'missing', ctx)).toThrow(
      'Responsable',
    )
    const next = assignServiceIncident(workspace, incident.id, person('peon').id, ctx)
    expect(next.incidents[0]?.assignedTo).toBe(person('peon').id)
    expect(next.incidents[0]?.entries[0]?.kind).toBe('asignacion')
    expect(assignServiceIncident(next, incident.id, person('peon').id, ctx)).toBe(next)
    expect(visibleIncidents(next, person('peon'))).toHaveLength(1)
  })

  it.each([
    { date: '2026-11-04' },
    { date: '2026-02-30' },
    { date: 'invalid' },
    { date: '2026-11-02' },
    { minutes: -1 },
    { minutes: 1.5 },
    { minutes: 1441 },
    { minutes: Number.NaN },
    { text: '  ' },
  ])('rejects invalid visits: %j', (patch) => {
    const ctx = context('capataz')
    const { workspace, incident } = createServiceIncident(base, input, ctx)
    expect(() => addIncidentVisit(workspace, incident.id, { ...visit, ...patch }, ctx)).toThrow()
    expect(incident.entries).toHaveLength(0)
  })

  it('validates identity, required fields, lengths and referenced entities', () => {
    const ctx = context('admin')
    for (const patch of [
      { clientId: 'missing' },
      { title: ' ' },
      { description: ' ' },
      { assignedTo: 'missing' },
      { title: 'x'.repeat(161) },
    ])
      expect(() => createServiceIncident(base, { ...input, ...patch }, ctx)).toThrow()
    expect(() => createServiceIncident(base, input, { ...ctx, actorId: null })).toThrow(
      'Inicia sesión',
    )
  })

  it('prepares an editable budget without inventing quantities, hectares or prices', () => {
    const { incident } = createServiceIncident(base, input, context('admin'))
    const draft = incidentBudgetDraft(incident, '2026-11-03')
    expect(draft.clientId).toBe(incident.clientId)
    expect(draft.title).toBe(incident.title)
    expect(draft.notes).toContain(incident.code)
    expect(draft.notes).toContain(incident.description)
    expect(draft.lines).toMatchObject([
      { kind: 'libre', description: incident.title, quantity: 1, unitPrice: 0 },
    ])
    expect(base.budgets.some((budget) => budget.incidentId === incident.id)).toBe(false)
  })

  it('saves one linked budget, returns it on retry and retains the relation when edited', () => {
    const ctx = context('admin')
    const { workspace, incident } = createServiceIncident(base, input, ctx)
    const draft = { ...incidentBudgetDraft(incident, ctx.today), zoneId: zone.id }
    const saved = budgetFromIncident(workspace, incident.id, draft, ctx)
    expect(saved.budget).toMatchObject({
      incidentId: incident.id,
      clientId: incident.clientId,
      status: 'borrador',
    })
    expect(saved.workspace.incidents[0]?.status).toBe('abierta')
    const retried = budgetFromIncident(saved.workspace, incident.id, draft, ctx)
    expect(retried.budget.id).toBe(saved.budget.id)
    expect(retried.workspace.budgets).toHaveLength(workspace.budgets.length + 1)
    const edited = saveBudget(
      saved.workspace,
      { ...draft, title: 'Retirada de pino' },
      ctx,
      saved.budget.id,
    )
    expect(edited.budget.incidentId).toBe(incident.id)
    expect(() =>
      saveBudget(saved.workspace, { ...draft, clientId: otherClient.id }, ctx, saved.budget.id),
    ).toThrow('cliente')
  })

  it('rejects worker conversion, a changed client or an unknown zone without saving a budget', () => {
    const ctx = context('admin')
    const { workspace, incident } = createServiceIncident(base, input, ctx)
    const draft = { ...incidentBudgetDraft(incident, ctx.today), zoneId: zone.id }
    expect(() => budgetFromIncident(workspace, incident.id, draft, context('capataz'))).toThrow(
      'Solo la oficina',
    )
    expect(() =>
      budgetFromIncident(workspace, incident.id, { ...draft, clientId: otherClient.id }, ctx),
    ).toThrow('cliente')
    expect(() =>
      budgetFromIncident(workspace, incident.id, { ...draft, zoneId: 'missing' }, ctx),
    ).toThrow('zona')
    expect(workspace.budgets).toBe(base.budgets)
  })
})
