import { Badge, Button, IconButton } from '@doscientos/ui'
import { Trash2, TrendingDown, TrendingUp } from 'lucide-react'

import {
  historicYield,
  type BudgetLine,
  type LineEstimate,
  type Workspace,
} from '@/features/workspace'
import { formatMoney, formatNumber } from '@/shared/lib/format'
import { ChoiceField, NumberField, TextField } from '@/shared/ui/form-controls'

import { plantingDefaults } from '../application/budget-draft'
import { FreeLineFields } from './free-line-fields'
import { NewSpeciesShortcut } from './quick-create-dialogs'

export function BudgetLineEditor({
  index,
  line,
  estimate,
  workspace,
  onChange,
  onRemove,
}: {
  index: number
  line: BudgetLine
  estimate: LineEstimate | undefined
  workspace: Workspace
  onChange: (patch: Partial<BudgetLine>) => void
  onRemove: () => void
}) {
  const history = line.kind === 'plantacion' ? historicYield(workspace, line.speciesId) : null
  const label = `Partida ${index + 1}`

  return (
    <li className="px-4 py-3" aria-label={label}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          {label}
          <span className="text-muted-foreground ml-2 text-xs font-normal">
            {line.kind === 'plantacion'
              ? 'Plantación'
              : line.kind === 'libre'
                ? 'Libre'
                : 'Tratamiento'}
          </span>
        </p>
        <div className="flex items-center gap-2">
          {line.kind === 'libre' ? (
            <span className="text-sm font-semibold tabular-nums">
              {formatMoney(estimate?.fixedPrice ?? 0, true)}
            </span>
          ) : null}
          <IconButton
            label={`Quitar ${label.toLowerCase()}`}
            variant="ghost"
            size="icon-sm"
            onPress={onRemove}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </IconButton>
        </div>
      </div>
      {line.kind === 'plantacion' ? (
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-12">
          <ChoiceField
            className="col-span-2 xl:col-span-6"
            label="Especie"
            value={line.speciesId}
            onChange={(speciesId) =>
              onChange({ speciesId, ...plantingDefaults(workspace, speciesId) })
            }
            options={workspace.species.map((item) => ({ value: item.id, label: item.name }))}
          />
          <NumberField
            className="xl:col-span-3"
            label="Superficie"
            suffix="ha"
            value={line.hectares}
            onChange={(hectares) => onChange({ hectares })}
          />
          <NumberField
            className="xl:col-span-3"
            label="Densidad"
            suffix="pl/ha"
            value={line.density}
            onChange={(density) => onChange({ density })}
          />
        </div>
      ) : line.kind === 'libre' ? (
        <FreeLineFields line={line} onChange={onChange} />
      ) : (
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-12">
          <TextField
            className="col-span-2 xl:col-span-8"
            label="Descripción"
            value={line.description}
            onChange={(description) => onChange({ description })}
          />
          <NumberField
            className="col-span-2 xl:col-span-4"
            label="Superficie"
            suffix="ha"
            value={line.hectares}
            onChange={(hectares) => onChange({ hectares })}
          />
        </div>
      )}
      {line.kind !== 'libre' ? (
        <details className="mt-2 text-xs">
          <summary className="text-muted-foreground cursor-pointer">
            {estimate && estimate.plants > 0 ? (
              <span>{formatNumber(estimate.plants)} plantas · </span>
            ) : null}
            {estimate ? <span>{formatNumber(estimate.workerDays, 1)} peonadas · </span> : null}
            Rendimiento y opciones
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <NumberField
              label="Rendimiento"
              suffix={line.kind === 'plantacion' ? 'pl/peón' : 'ha/peón'}
              value={line.kind === 'plantacion' ? line.yieldPerDay : line.hectaresPerDay}
              onChange={(value) =>
                onChange(
                  line.kind === 'plantacion' ? { yieldPerDay: value } : { hectaresPerDay: value },
                )
              }
            />
            {line.kind === 'plantacion' ? (
              <NewSpeciesShortcut
                onCreated={(species) =>
                  onChange({ speciesId: species.id, ...plantingDefaults(workspace, species.id) })
                }
              />
            ) : null}
          </div>
          {history && line.kind === 'plantacion' ? (
            <HistoryHint
              real={history.yield}
              current={line.yieldPerDay}
              works={history.works}
              onApply={() => onChange({ yieldPerDay: Math.round(history.yield / 5) * 5 })}
            />
          ) : null}
        </details>
      ) : null}
    </li>
  )
}

function HistoryHint({
  real,
  current,
  works,
  onApply,
}: {
  real: number
  current: number
  works: number
  onApply: () => void
}) {
  const optimistic = current > real * 1.03
  const differs = Math.abs(current - real) > real * 0.03
  const Icon = optimistic ? TrendingDown : TrendingUp
  const suggested = Math.max(5, Math.round(real / 5) * 5)
  return (
    <Badge
      variant={optimistic ? 'warning' : 'success'}
      className="mt-2 gap-1.5 whitespace-normal"
      title="Plantas por peón y día que salen de los partes de las obras ya terminadas con solo esta especie y sin tratamientos."
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {optimistic
        ? `Pones ${formatNumber(current)} pl/peón y día; en ${works === 1 ? 'tu última obra' : `tus ${works} obras`} terminadas rindieron ${formatNumber(real)}. Puede salirte corto.`
        : `En ${works === 1 ? 'tu obra terminada' : `tus ${works} obras terminadas`} de esta especie se plantaron ${formatNumber(real)} pl/peón y día.`}
      {differs ? (
        <Button variant="link" size="xs" onPress={onApply}>
          Usar {formatNumber(suggested)}
        </Button>
      ) : null}
    </Badge>
  )
}
