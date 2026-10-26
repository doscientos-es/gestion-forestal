import { Checkbox, cn } from '@doscientos/ui'

import { absenceOn, absenceType, type Absence, type Person } from '@/features/workspace'
import type { IsoDate } from '@/shared/lib/dates'

export function CrewChecklist({
  members,
  selected,
  date,
  absences,
  onToggle,
}: {
  members: Person[]
  selected: string[]
  date: IsoDate
  absences: Absence[]
  onToggle: (personId: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">
        ¿Quién ha trabajado hoy?{' '}
        <span className="text-muted-foreground font-normal">
          {selected.length} de {members.length}
        </span>
      </legend>
      <ul className="grid gap-2 sm:grid-cols-2">
        {members.map((person) => {
          const checked = selected.includes(person.id)
          const absence = absenceOn(person.id, date, absences)
          return (
            <li key={person.id}>
              <Checkbox
                isSelected={checked}
                onChange={() => onToggle(person.id)}
                className={cn(
                  'flex min-h-14 w-full items-center gap-3 rounded-lg border px-3 transition-colors',
                  checked ? 'border-brand bg-brand-soft/50' : 'border-border bg-card',
                )}
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
              </Checkbox>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
