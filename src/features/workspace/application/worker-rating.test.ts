import { describe, expect, it } from 'vitest'

import { buildSeed } from '../infrastructure/build-seed'
import { submitReport, type Context, type ReportInput } from './commands'
import type { DailyReport, Workspace } from './model'
import { workerPerformance } from './worker-performance'
import { workerRating, workerRatingSummary } from './worker-rating'

const seed = buildSeed('2026-11-04')
const source = seed.works[0]
if (!source) throw new Error('Missing fixture work')
const work = { ...source, id: 'work', year: 2026, status: 'en_curso' as const }
const state: Workspace = { ...seed, works: [work], reports: [] }
const context: Context = {
  id: () => 'new-report',
  today: '2026-11-04',
  now: '2026-11-04T12:00:00Z',
  actorId: 'p-javier',
}
const input: ReportInput = {
  workId: work.id,
  crewId: 'cr-sur',
  date: context.today,
  workerIds: ['p-javier', 'p-mikel'],
  workerRatings: { 'p-javier': 1, 'p-mikel': 10 },
  plants: 400,
  hectares: 1,
  incident: 'ninguna',
  notes: '',
  photos: [],
  authorId: 'p-javier',
}
function report(patch: Partial<DailyReport> = {}): DailyReport {
  return { ...input, id: 'report', ...patch }
}

describe('daily individual ratings', () => {
  it('saves explicit scores including both scale endpoints, without mutating the input workspace', () => {
    const next = submitReport(state, input, context)
    expect(next.reports[0]?.workerRatings).toEqual(input.workerRatings)
    expect(state.reports).toEqual([])
  })

  it('updates the same report and removes ratings of workers no longer present', () => {
    const first = submitReport(state, input, context)
    const next = submitReport(
      first,
      {
        ...input,
        workerIds: ['p-javier'],
        workerRatings: { 'p-javier': 9 },
      },
      context,
    )
    expect(next.reports).toHaveLength(1)
    expect(next.reports[0]).toMatchObject({ id: 'new-report', workerRatings: { 'p-javier': 9 } })
  })

  it.each([0, 11, -1, 7.5, NaN, Infinity])('rejects invalid rating %s', (score) => {
    expect(() =>
      submitReport(
        state,
        {
          ...input,
          workerRatings: { ...input.workerRatings, 'p-javier': score },
        },
        context,
      ),
    ).toThrow('nota entera de 1 a 10')
  })

  it('rejects missing scores, absent workers and duplicate attendance', () => {
    expect(() => submitReport(state, { ...input, workerRatings: {} }, context)).toThrow(
      'cada trabajador',
    )
    expect(() =>
      submitReport(
        state,
        {
          ...input,
          workerRatings: { ...input.workerRatings, absent: 5 },
        },
        context,
      ),
    ).toThrow('trabajadores presentes')
    expect(() =>
      submitReport(
        state,
        {
          ...input,
          workerIds: ['p-javier', 'p-javier'],
          workerRatings: { 'p-javier': 8 },
        },
        context,
      ),
    ).toThrow('repetidos')
    expect(() =>
      submitReport(state, { ...input, workerIds: [], workerRatings: {} }, context),
    ).toThrow('al menos un trabajador')
  })

  it('requires scores when editing a historical report, but still reads it as unrated', () => {
    const legacy = report({ workerRatings: undefined })
    expect(workerRating(legacy, 'p-javier')).toBeNull()
    expect(workerRatingSummary([legacy], 'p-javier')).toEqual({
      ratedReports: 0,
      averageRating: null,
    })
    const upgraded = submitReport({ ...state, reports: [legacy] }, input, context)
    expect(upgraded.reports[0]).toMatchObject({ id: legacy.id, workerRatings: input.workerRatings })
  })

  it('ignores corrupt or non-attending historical scores rather than treating them as zero', () => {
    expect(workerRating(report({ workerRatings: { 'p-javier': 12 } }), 'p-javier')).toBeNull()
    expect(workerRating(report({ workerIds: ['p-mikel'] }), 'p-javier')).toBeNull()
    expect(
      workerRatingSummary(
        [
          report({ workerRatings: { 'p-javier': 6 } }),
          report({ workerRatings: { 'p-javier': 10 } }),
          report({ workerRatings: undefined }),
        ],
        'p-javier',
      ),
    ).toEqual({ ratedReports: 2, averageRating: 8 })
  })

  it('filters ratings by campaign, uses historical attendance and returns a newest-first history', () => {
    const old = { ...work, id: 'old-work', year: 2025 }
    const workspace: Workspace = {
      ...state,
      works: [work, old],
      people: state.people.map((person) => ({ ...person, crewId: 'different-crew' })),
      reports: [
        report({ id: 'first', date: '2026-10-01', workerRatings: { 'p-javier': 6 } }),
        report({ id: 'legacy', date: '2026-10-02', workerRatings: undefined }),
        report({ id: 'latest', date: '2026-10-03', workerRatings: { 'p-javier': 10 } }),
        report({ id: 'old', workId: old.id, date: '2025-10-01', workerRatings: { 'p-javier': 2 } }),
      ],
    }
    const current = workerPerformance(workspace, 2026).find((row) => row.person.id === 'p-javier')
    expect(current).toMatchObject({ ratedReports: 2, reportCount: 3, averageRating: 8 })
    expect(current?.works[0]).toMatchObject({ ratedReports: 2, averageRating: 8 })
    expect(current?.ratingHistory.map(({ report: entry }) => entry.id)).toEqual(['latest', 'first'])
    expect(
      workerPerformance(workspace, 2025).find((row) => row.person.id === 'p-javier')?.averageRating,
    ).toBe(2)
    expect(
      workerPerformance(workspace, null).find((row) => row.person.id === 'p-javier')?.averageRating,
    ).toBe(6)
  })
})
