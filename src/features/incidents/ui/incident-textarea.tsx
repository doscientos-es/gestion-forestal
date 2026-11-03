import { Field, FieldLabel, Textarea } from '@doscientos/ui'
import { useId } from 'react'

export function IncidentTextarea({ label, value, onChange, required = false, maxLength = 4000 }: {
  label: string; value: string; onChange: (value: string) => void; required?: boolean; maxLength?: number
}) {
  const id = useId()
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={id} className="text-muted-foreground text-xs font-medium">{label}</FieldLabel>
      <Textarea id={id} value={value} required={required} maxLength={maxLength} rows={3}
        onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}