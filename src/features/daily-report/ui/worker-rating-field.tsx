import { cn } from '@doscientos/ui'
import { useId } from 'react'

import { WORKER_RATINGS } from '@/features/workspace'

export function WorkerRatingField({
  name,
  value,
  onChange,
}: {
  name: string
  value: number | undefined
  onChange: (score: number) => void
}) {
  const id = useId()
  return (
    <fieldset className="border-border border-t px-1 py-3 min-[360px]:px-3">
      <legend className="sr-only">Nota del día de {name}</legend>
      <div className="grid grid-cols-5 gap-1 min-[360px]:gap-2 sm:grid-cols-10">
        {WORKER_RATINGS.map((score) => (
          <label key={score} className="relative cursor-pointer">
            <input
              type="radio"
              name={id}
              value={score}
              checked={value === score}
              onChange={() => onChange(score)}
              aria-label={`${score} de 10`}
              className="peer sr-only"
            />
            <span
              className={cn(
                'flex min-h-11 items-center justify-center rounded-lg border text-sm font-semibold tabular-nums peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand',
                value === score
                  ? 'border-brand bg-brand text-white'
                  : 'border-border bg-background text-foreground hover:border-brand',
              )}
            >
              {score}
            </span>
          </label>
        ))}
      </div>
      <div className="text-muted-foreground mt-2 flex justify-between text-[0.6875rem]">
        <span>1 · Muy mejorable</span>
        <span>5 · Adecuado</span>
        <span>10 · Excelente</span>
      </div>
    </fieldset>
  )
}
