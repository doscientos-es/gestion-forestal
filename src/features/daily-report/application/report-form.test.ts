import { describe, expect, it } from 'vitest'

import type { DailyReport } from '@/features/workspace'
import { buildSeed } from '@/features/workspace/infrastructure/build-seed'

import { initialForm, pendingWorkerRatings, reportContext, toggleReportWorker } from './report-form'

const today = '2026-11-04'
const seed = buildSeed(today)
const foreman = seed.people.find((person) => person.id === 'p-javier')
const work = seed.works[0]
if (!foreman?.crewId || !work) throw new Error('Missing fixture foreman or work')
const workspace = {
  ...seed,
  reports: [],
  assignments: [{ id: 'assignment', workId: work.id, crewId: foreman.crewId, start: today, end: today }],
}
const context = reportContext(workspace, foreman, today)
if (!context) throw new Error('Missing fixture assignment')

describe('daily report rating form', () => {
  it('does not invent default ratings for a new report', () => {
    const form = initialForm({ ...context, existing: null }, workspace)
    expect(form.workerIds.length).toBeGreaterThan(0)
    expect(form.workerRatings).toEqual({})
    expect(pendingWorkerRatings(form)).toBe(form.workerIds.length)
  })

  it('restores saved scores and treats historical reports without scores as pending', () => {
    const form = initialForm({ ...context, existing: null }, workspace)
    const workerRatings = Object.fromEntries(form.workerIds.map((id) => [id, 8]))
    const existing = {
      ...form,
      workerRatings,
      id: 'existing',
      workId: context.work.id,
      crewId: context.crewId,
      date: today,
      authorId: foreman.id,
    }
    expect(pendingWorkerRatings(initialForm({ ...context, existing }, workspace))).toBe(0)
    expect(initialForm({ ...context, existing }, workspace).workerRatings).toEqual(workerRatings)
    const historical: DailyReport = { ...existing }
    delete historical.workerRatings
    const legacy = initialForm({ ...context, existing: historical }, workspace)
    expect(pendingWorkerRatings(legacy)).toBe(form.workerIds.length)
  })

  it('removes the score on absence and requires a deliberate new rating after reselecting', () => {
    const form = {
      ...initialForm({ ...context, existing: null }, workspace),
      workerIds: ['a', 'b'],
      workerRatings: { a: 9, b: 7 },
    }
    const absent = toggleReportWorker(form, 'a')
    expect(absent.workerIds).toEqual(['b'])
    expect(absent.workerRatings).toEqual({ b: 7 })
    expect(pendingWorkerRatings(absent)).toBe(0)
    const returned = toggleReportWorker(absent, 'a')
    expect(pendingWorkerRatings(returned)).toBe(1)
    expect(form.workerRatings).toEqual({ a: 9, b: 7 })
  })

  it('keeps former crew members visible when editing their historical attendance', () => {
    const form = initialForm({ ...context, existing: null }, workspace)
    const former = workspace.people.find(
      (person) => person.role === 'peon' && person.crewId === context.crewId,
    )
    if (!former) throw new Error('Missing fixture worker')
    const next = {
      ...workspace,
      people: workspace.people.map((person) =>
        person.id === former.id ? { ...person, crewId: null } : person,
      ),
      reports: [
        {
          ...form,
          id: 'existing',
          workId: context.work.id,
          crewId: context.crewId,
          date: today,
          authorId: foreman.id,
        },
      ],
    }
    expect(
      reportContext(next, foreman, today)?.members.some((person) => person.id === former.id),
    ).toBe(true)
  })
})
