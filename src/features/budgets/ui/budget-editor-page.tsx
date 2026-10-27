import { Alert, AlertDescription, AlertTitle, Button } from '@doscientos/ui'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Sprout, Tractor } from 'lucide-react'
import { useState } from 'react'

import {
  estimateBudget,
  useWorkspace,
  validateBudget,
  type BudgetInput,
  type BudgetParams,
} from '@/features/workspace'
import { formatMoney } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { ChoiceField, NumberField, TextField } from '@/shared/ui/form-controls'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader } from '@/shared/ui/surface'

import { budgetsApi } from '../api'
import { newPlantingLine, newTreatmentLine, updateLine } from '../application/budget-draft'
import { BudgetLineEditor } from './budget-line-editor'
import { BudgetPreview } from './budget-preview'
import { NewClientShortcut, NewZoneShortcut } from './quick-create-dialogs'

export function BudgetEditorPage({
  initial,
  budgetId,
}: {
  initial: BudgetInput
  budgetId?: string
}) {
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<BudgetInput>(initial)
  const [showErrors, setShowErrors] = useState(false)
  const estimate = estimateBudget(draft.lines, draft.params, workspace.species)
  const issues = validateBudget(draft)
  const invalid = (field: string) => showErrors && issues.some((issue) => issue.field === field)
  const patch = (value: Partial<BudgetInput>) => setDraft((current) => ({ ...current, ...value }))
  const setParam = (value: Partial<BudgetParams>) =>
    setDraft((current) => ({ ...current, params: { ...current.params, ...value } }))

  const save = useCommand((input: BudgetInput) => budgetsApi.save(input, budgetId), {
    success: (budget) => ({
      title: budgetId ? 'Presupuesto actualizado' : 'Presupuesto guardado',
      description: `${budget.title} · ${formatMoney(estimate.price)} + IVA`,
    }),
    onSuccess: (budget) =>
      void navigate({ to: '/presupuestos/$budgetId', params: { budgetId: budget.id } }),
  })

  function submit() {
    if (issues.length > 0) return setShowErrors(true)
    save.mutate(draft)
  }

  return (
    <>
      <PageTop
        back={{ to: '/presupuestos', label: 'Volver a presupuestos' }}
        title={budgetId ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        description="Los cálculos se actualizan al escribir. Guarda como borrador y envíalo cuando esté listo."
        actions={
          <>
            <Button variant="ghost" onPress={() => void navigate({ to: '/presupuestos' })}>
              Cancelar
            </Button>
            <Button onPress={submit} isDisabled={save.isPending}>
              Guardar presupuesto
            </Button>
          </>
        }
      />
      {showErrors && issues.length > 0 ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Revisa el presupuesto</AlertTitle>
          <AlertDescription>{issues.map((issue) => issue.message).join(' ')}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Panel aria-labelledby="budget-general">
            <PanelHeader
              id="budget-general"
              title="1 · ¿Qué obra es?"
              description="Ponle nombre y elige para quién y dónde se hace."
            />
            <div className="grid gap-3 p-5 md:grid-cols-2">
              <TextField
                className="md:col-span-2"
                label="Nombre de la obra"
                placeholder="Ej. Repoblación ladera norte"
                value={draft.title}
                invalid={invalid('title')}
                onChange={(title) => patch({ title })}
              />
              <ChoiceField
                label="Cliente"
                value={draft.clientId}
                onChange={(clientId) => patch({ clientId })}
                options={workspace.clients.map((client) => ({
                  value: client.id,
                  label: client.name,
                }))}
                footer={
                  <NewClientShortcut onCreated={(client) => patch({ clientId: client.id })} />
                }
              />
              <ChoiceField
                label="Zona"
                value={draft.zoneId}
                onChange={(zoneId) => patch({ zoneId })}
                options={workspace.zones.map((zone) => ({ value: zone.id, label: zone.name }))}
                footer={<NewZoneShortcut onCreated={(zone) => patch({ zoneId: zone.id })} />}
              />
            </div>
          </Panel>
          <Panel aria-labelledby="budget-lines">
            <PanelHeader
              id="budget-lines"
              title="2 · ¿Qué trabajo hay que hacer?"
              description="Añade una partida por cada plantación o tratamiento. Se calcula sola."
              action={
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => patch({ lines: [...draft.lines, newTreatmentLine()] })}
                  >
                    <Tractor aria-hidden="true" className="size-4" /> Tratamiento
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => patch({ lines: [...draft.lines, newPlantingLine(workspace)] })}
                  >
                    <Plus aria-hidden="true" className="size-4" /> Plantación
                  </Button>
                </div>
              }
            />
            {draft.lines.length === 0 ? (
              <p className="text-muted-foreground flex items-center gap-2 px-5 py-8 text-sm">
                <Sprout aria-hidden="true" className="size-4" /> Añade una plantación o un
                tratamiento para calcular.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {draft.lines.map((line, index) => (
                  <BudgetLineEditor
                    key={line.id}
                    index={index}
                    line={line}
                    estimate={estimate.lines[index]}
                    workspace={workspace}
                    onChange={(value) => patch({ lines: updateLine(draft.lines, line.id, value) })}
                    onRemove={() =>
                      patch({ lines: draft.lines.filter((item) => item.id !== line.id) })
                    }
                  />
                ))}
              </ul>
            )}
          </Panel>
          <Panel aria-labelledby="budget-params">
            <PanelHeader
              id="budget-params"
              title="3 · ¿Cuánto cuesta y cuánto quieres ganar?"
              description="Ya vienen con los valores habituales de la empresa; cámbialos si esta obra es distinta."
            />
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <NumberField
                label="Personas en la cuadrilla"
                suffix="pers."
                min={1}
                value={draft.params.crewSize}
                onChange={(crewSize) => setParam({ crewSize })}
              />
              <NumberField
                label="Coste de una peonada (un día de una persona)"
                suffix="€"
                value={draft.params.dailyCost / 100}
                onChange={(value) => setParam({ dailyCost: Math.round(value * 100) })}
              />
              <NumberField
                label="Desplazamiento de la cuadrilla, por día"
                suffix="€"
                value={draft.params.travelPerCrewDay / 100}
                onChange={(value) => setParam({ travelPerCrewDay: Math.round(value * 100) })}
              />
              <NumberField
                label="Margen que quieres ganar (máx. 60)"
                suffix="%"
                value={Math.round(draft.params.targetMargin * 100)}
                onChange={(value) => setParam({ targetMargin: Math.min(value, 60) / 100 })}
              />
            </div>
          </Panel>
        </div>
        <BudgetPreview estimate={estimate} />
      </div>
    </>
  )
}
