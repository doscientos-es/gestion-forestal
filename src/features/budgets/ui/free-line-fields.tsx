import type { FreeLine } from '@/features/workspace'
import { formatMoney } from '@/shared/lib/format'
import { NumberField, TextField } from '@/shared/ui/form-controls'

export function FreeLineFields({
  line,
  onChange,
}: {
  line: FreeLine
  onChange: (patch: Partial<FreeLine>) => void
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-12">
        <TextField
          className="col-span-2 xl:col-span-5"
          label="Concepto"
          placeholder="Ej. Alquiler de maquinaria, vallado, transporte…"
          value={line.description}
          onChange={(description) => onChange({ description })}
        />
        <NumberField
          className="xl:col-span-2"
          label="Cantidad"
          value={line.quantity}
          onChange={(quantity) => onChange({ quantity })}
        />
        <TextField
          className="xl:col-span-2"
          label="Unidad"
          placeholder="ud, h, m, viaje…"
          value={line.unit}
          onChange={(unit) => onChange({ unit })}
        />
        <NumberField
          className="col-span-2 xl:col-span-3"
          label="Precio unitario sin IVA"
          suffix="€"
          value={line.unitPrice / 100}
          onChange={(value) => onChange({ unitPrice: Math.round(value * 100) })}
        />
      </div>
      <details className="mt-2 text-xs">
        <summary className="text-muted-foreground cursor-pointer">
          Coste interno (opcional) · {formatMoney(line.unitCost, true)} / {line.unit || 'ud'}
        </summary>
        <div className="mt-2 max-w-sm">
          <NumberField
            label="Coste interno por unidad"
            suffix="€"
            value={line.unitCost / 100}
            onChange={(value) => onChange({ unitCost: Math.round(value * 100) })}
          />
          <p className="text-muted-foreground mt-2">
            No aparece en la propuesta del cliente. Si no lo indicas, el margen se calcula con coste
            cero.
          </p>
        </div>
      </details>
    </>
  )
}
