import { Badge, Button, IconButton } from '@doscientos/ui'
import { Trash2, TrendingDown, TrendingUp } from 'lucide-react'

import {
  historicYield,
  type BudgetLine,
  type LineEstimate,
  type Workspace,
} from '@/features/workspace'
import { formatNumber } from '@/shared/lib/format'
import { ChoiceField, NumberField, TextField } from '@/shared/ui/form-controls'

import { plantingDefaults } from '../application/budget-draft'

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
    <li className="px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          {label}
          <span className="text-muted-foreground ml-2 text-xs font-normal">
            {line.kind === 'plantacion' ? 'Plantación' : 'Tratamiento'}
          </span>
        </p>
        <IconButton
          label={`Quitar ${label.toLowerCase()}`}
          variant="ghost"
          size="icon-sm"
          onPress={onRemove}
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </IconButton>
      </div>
      {line.kind === 'plantacion' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ChoiceField
            className="col-span-2 sm:col-span-3"
            label="Especie"
            value={line.speciesId}
            onChange={(speciesId) =>
              onChange({ speciesId, ...plantingDefaults(workspace, speciesId) })
            }
            options={workspace.species.map((item) => ({ value: item.id, label: item.name }))}
          />
          <NumberField
            label="Superficie"
            suffix="ha"
            value={line.hectares}
            onChange={(hectares) => onChange({ hectares })}
          />
          <NumberField
            label="Densidad"
            suffix="pl/ha"
            value={line.density}
            onChange={(density) => onChange({ density })}
          />
          <NumberField
            label="Rendimiento"
            suffix="pl/peón"
            value={line.yieldPerDay}
            onChange={(yieldPerDay) => onChange({ yieldPerDay })}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <TextField
            className="col-span-2"
            label="Descripción"
            value={line.description}
            onChange={(description) => onChange({ description })}
          />
          <NumberField
            label="Superficie"
            suffix="ha"
            value={line.hectares}
            onChange={(hectares) => onChange({ hectares })}
          />
          <NumberField
            label="Rendimiento"
            suffix="ha/peón"
            value={line.hectaresPerDay}
            onChange={(hectaresPerDay) => onChange({ hectaresPerDay })}
          />
        </div>
      )}
      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {estimate && estimate.plants > 0 ? (
          <span>{formatNumber(estimate.plants)} plantas</span>
        ) : null}
        {estimate ? <span>{formatNumber(estimate.workerDays, 1)} peonadas</span> : null}
        {history && line.kind === 'plantacion' ? (
          <HistoryHint
            real={history.yield}
            current={line.yieldPerDay}
            works={history.works}
            onApply={() => onChange({ yieldPerDay: Math.round(history.yield / 5) * 5 })}
          />
        ) : null}
      </div>
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
  return (
    <Badge variant={optimistic ? 'warning' : 'success'} className="gap-1.5">
      <Icon aria-hidden="true" className="size-3.5" />
      Real en {works} {works === 1 ? 'obra' : 'obras'}: {formatNumber(real)} pl/peón
      {optimistic ? ' · tu cifra es optimista' : ''}
      {differs ? (
        <Button variant="link" size="xs" onPress={onApply}>
          Usar
        </Button>
      ) : null}
    </Badge>
  )
}
