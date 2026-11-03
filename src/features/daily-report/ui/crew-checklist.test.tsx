import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { buildSeed } from '@/features/workspace/infrastructure/build-seed'

import { CrewChecklist } from './crew-checklist'

const people = buildSeed('2026-11-04').people.filter((person) => person.role !== 'admin').slice(0, 2)
const [first, second] = people
if (!first || !second) throw new Error('Missing fixture people')

function render(selected: string[], ratings: Record<string, number> = {}) {
  return renderToStaticMarkup(
    <CrewChecklist
      members={people}
      selected={selected}
      ratings={ratings}
      date="2026-11-04"
      absences={[]}
      onToggle={vi.fn()}
      onRate={vi.fn()}
    />,
  )
}

describe('crew attendance and rating controls', () => {
  it('offers ten labelled numeric options only for attending workers, without default scores', () => {
    const html = render([first.id])
    const radios = html.match(/<input[^>]*type="radio"[^>]*>/g) ?? []
    expect(radios).toHaveLength(10)
    expect(radios.every((radio) => !radio.includes('checked=""'))).toBe(true)
    expect(html).toContain(`Nota del día de ${first.name}`)
    expect(html).not.toContain(`Nota del día de ${second.name}`)
    expect(html).toContain('Sin valorar')
    expect(html).toContain('No ha venido')
    expect(radios[0]).toContain('aria-label="1 de 10"')
    expect(radios[9]).toContain('aria-label="10 de 10"')
  })

  it('restores each worker selection in an independent native keyboard-accessible radio group', () => {
    const html = render([first.id, second.id], { [first.id]: 8, [second.id]: 3 })
    const radios = html.match(/<input[^>]*type="radio"[^>]*>/g) ?? []
    expect(radios).toHaveLength(20)
    const selected = radios.filter((radio) => radio.includes('checked=""'))
    expect(selected).toHaveLength(2)
    expect(selected[0]).toContain('value="8"')
    expect(selected[1]).toContain('value="3"')
    const groups = new Set(radios.map((radio) => radio.match(/name="([^"]+)"/)?.[1]))
    expect(groups.size).toBe(2)
  })

  it('hides rating controls when nobody attended', () => {
    expect(render([])).not.toContain('type="radio"')
  })
})