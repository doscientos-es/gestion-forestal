import { Checkbox, cn } from '@doscientos/ui'

import { absenceOn, absenceType, type Absence, type Person } from '@/features/workspace'
import type { IsoDate } from '@/shared/lib/dates'

import { WorkerRatingField } from './worker-rating-field'

export function CrewChecklist({
  members,
  selected,
  ratings,
  date,
  absences,
  onToggle,
  onRate,
}: {
  members: Person[]
  selected: string[]
  ratings: Record<string, number>
  date: IsoDate
  absences: Absence[]
  onToggle: (personId: string) => void
  onRate: (personId: string, score: number) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">
        Asistencia y valoración{' '}
        <span className="text-muted-foreground font-normal">
          {selected.length} de {members.length}
        </span>
      </legend>
      <p className="text-muted-foreground mb-4 text-xs">
        Marca quién ha trabajado y valora su jornada del 1 al 10. No hay notas preseleccionadas.
      </p>
      <ul className="grid gap-3">
        {members.map((person) => {
          const checked = selected.includes(person.id)
          const absence = absenceOn(person.id, date, absences)
          return (
            <li
              key={person.id}
              className={cn(
                'overflow-hidden rounded-xl border',
                checked ? 'border-brand bg-brand-soft/30' : 'border-border bg-card',
              )}
            >
              <Checkbox
                isSelected={checked}
                onChange={() => onToggle(person.id)}
                className="flex min-h-16 w-full items-center gap-3 px-3 py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{person.name}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {absence
                      ? absenceType[absence.type]
                      : person.role === 'capataz'
                        ? 'Capataz'
                        : 'Peón'}
                  </span>
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-md px-2 py-1 text-xs font-semibold tabular-nums',
                    checked && ratings[person.id] ? 'bg-brand text-white' : 'text-muted-foreground',
                  )}
                >
                  {checked
                    ? ratings[person.id]
                      ? `${ratings[person.id]} / 10`
                      : 'Sin valorar'
                    : 'No ha venido'}
                </span>
              </Checkbox>
              {checked ? (
                <WorkerRatingField
                  name={person.name}
                  value={ratings[person.id]}
                  onChange={(score) => onRate(person.id, score)}
                />
              ) : null}
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
