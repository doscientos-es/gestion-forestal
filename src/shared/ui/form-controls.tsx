import {
  Field,
  FieldDescription,
  FieldLabel,
  IconButton,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Select,
  SelectContent,
  SelectItem,
  SelectList,
  SelectTrigger,
  SelectValue,
  cn,
} from '@doscientos/ui'
import { Minus, Plus } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

function parseDecimal(raw: string) {
  const value = Number(raw.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

function display(value: number) {
  // `type="number"` only understands a dot, whatever the browser language.
  return String(Math.round(value * 100) / 100)
}

/** Numeric input (number keyboard, no spinner) with its unit inside the field; keeps partial typing. */
export function NumberField({
  label,
  value,
  onChange,
  suffix,
  hint,
  min = 0,
  className,
  invalid = false,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  suffix?: string
  hint?: ReactNode
  min?: number
  className?: string
  invalid?: boolean
}) {
  const id = useId()
  const [text, setText] = useState(display(value))
  const [synced, setSynced] = useState(value)
  if (synced !== value) {
    setSynced(value)
    const parsed = parseDecimal(text)
    if (parsed === null || Math.abs(parsed - value) > 1e-9) setText(display(value))
  }

  return (
    <Field className={cn('min-w-0 gap-1.5', className)}>
      <FieldLabel htmlFor={id} className="text-muted-foreground text-xs font-medium">
        {label}
      </FieldLabel>
      <InputGroup className="h-10">
        <InputGroupInput
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step="any"
          value={text}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            setText(event.target.value)
            const parsed = parseDecimal(event.target.value)
            if (parsed !== null && parsed >= min) onChange(parsed)
          }}
          onBlur={() => setText(display(value))}
          className="min-w-0 [appearance:textfield] tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix ? (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{suffix}</InputGroupText>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      {hint ? <FieldDescription className="text-xs">{hint}</FieldDescription> : null}
    </Field>
  )
}

/** Large whole-number input with separate − / + buttons, easy to use with gloves or on mobile. */
export function StepperField({
  label,
  value,
  onChange,
  step = 50,
  min = 0,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
}) {
  const [text, setText] = useState(String(value))
  const [synced, setSynced] = useState(value)
  if (synced !== value) {
    setSynced(value)
    if (Number(text.replace(/\D/g, '')) !== value) setText(String(value))
  }
  const commit = (next: number) => {
    const safe = Math.max(min, Math.round(next))
    setText(String(safe))
    onChange(safe)
  }

  return (
    <div className="flex items-center gap-2">
      <IconButton
        label={`Quitar ${step}`}
        variant="outline"
        className="size-14 shrink-0"
        isDisabled={value <= min}
        onPress={() => commit(value - step)}
      >
        <Minus aria-hidden="true" className="size-5" />
      </IconButton>
      <Input
        aria-label={label}
        inputMode="numeric"
        value={text}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '')
          setText(digits)
          onChange(Math.max(min, Number(digits || 0)))
        }}
        onBlur={() => setText(String(value))}
        className="h-14 min-w-0 flex-1 text-center text-2xl font-semibold tabular-nums"
      />
      <IconButton
        label={`Añadir ${step}`}
        variant="outline"
        className="size-14 shrink-0"
        onPress={() => commit(value + step)}
      >
        <Plus aria-hidden="true" className="size-5" />
      </IconButton>
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  className,
  invalid = false,
  type = 'text',
  min,
  max,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  invalid?: boolean
  type?: 'text' | 'date'
  /** Earliest accepted date (ISO) when `type` is `date`. */
  min?: string | undefined
  /** Latest accepted date (ISO) when `type` is `date`. */
  max?: string | undefined
}) {
  const id = useId()
  return (
    <Field className={cn('min-w-0 gap-1.5', className)}>
      <FieldLabel htmlFor={id} className="text-muted-foreground text-xs font-medium">
        {label}
      </FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        {...(placeholder ? { placeholder } : {})}
        {...(min ? { min } : {})}
        {...(max ? { max } : {})}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-10"
      />
    </Field>
  )
}

export function ChoiceField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecciona…',
  className,
  hideLabel = false,
  footer,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
  hideLabel?: boolean
  /** Shown under the select, e.g. a "create new" shortcut. */
  footer?: ReactNode
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Select
        aria-label={label}
        placeholder={placeholder}
        selectedKey={value || null}
        onSelectionChange={(key) => onChange(key === null ? '' : String(key))}
      >
        {hideLabel ? null : (
          <span className="text-muted-foreground text-xs font-medium" aria-hidden="true">
            {label}
          </span>
        )}
        <SelectTrigger className="h-10 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectList>
            {options.map((option) => (
              <SelectItem key={option.value} id={option.value} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </SelectList>
        </SelectContent>
      </Select>
      {footer}
    </div>
  )
}
