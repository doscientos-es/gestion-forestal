import { Button, Textarea } from '@doscientos/ui'
import { Link } from '@tanstack/react-router'
import { CalendarOff, CheckCircle2, MapPin } from 'lucide-react'
import { useState } from 'react'

import {
  calculatePerformance,
  incidentLabels,
  lookup,
  useCurrentUser,
  useWorkspace,
  type Incident,
} from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { formatLongDate, formatNumber, formatPercent } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { AttachmentField } from '@/shared/ui/attachment-field'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { NumberField, StepperField } from '@/shared/ui/form-controls'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, ProgressBar } from '@/shared/ui/surface'

import { dailyReportApi } from '../api'
import {
  MAX_REPORT_PHOTOS,
  hectaresFor,
  initialForm,
  reportContext,
  type ReportForm,
} from '../application/report-form'
import { CrewChecklist } from './crew-checklist'

const incidents: Incident[] = ['ninguna', 'lluvia', 'terreno', 'averia', 'planta']

export function DailyReportPage() {
  const workspace = useWorkspace()
  const user = useCurrentUser()
  const today = clock.today()
  const context = user ? reportContext(workspace, user, today) : null
  const [form, setForm] = useState<ReportForm | null>(() =>
    context ? initialForm(context, workspace) : null,
  )
  const [saved, setSaved] = useState(Boolean(context?.existing))
  const submit = useCommand(dailyReportApi.submit, {
    success: (_output, input) => ({
      title: context?.existing ? 'Parte actualizado' : 'Parte enviado',
      description: `${formatNumber(input.plants)} plantas · ${input.workerIds.length} personas`,
    }),
    onSuccess: () => setSaved(true),
  })
  if (!user) return null
  const find = lookup(workspace)

  if (!context || !form) {
    return (
      <>
        <PageTop title="Parte diario" description={formatLongDate(today)} />
        <Panel>
          <EmptyPanel
            icon={<CalendarOff className="size-5" />}
            title="Hoy tu cuadrilla no tiene obra asignada"
            description="Cuando la oficina te asigne una obra, aparecerá aquí para rellenar el parte."
            action={
              <Link to="/ausencias" className="text-sm font-medium underline">
                Ver mis vacaciones
              </Link>
            }
          />
        </Panel>
      </>
    )
  }

  const performance = calculatePerformance(context.work, workspace.reports, workspace.people)
  const update = (patch: Partial<ReportForm>) => {
    setSaved(false)
    setForm((current) => (current ? { ...current, ...patch } : current))
  }
  const ratio = context.target > 0 ? form.plants / context.target : 0

  function send() {
    if (!form || !context || !user) return
    submit.mutate({
      ...form,
      workId: context.work.id,
      crewId: context.crewId,
      date: context.date,
      authorId: user.id,
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageTop
        title="Parte de hoy"
        description={`${formatLongDate(today)} · ${find.crew(context.crewId)?.name}`}
      />
      <Panel className="mb-4 p-5">
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <MapPin aria-hidden="true" className="size-3.5" /> {find.zone(context.work.zoneId)?.name}
        </p>
        <p className="mt-1 text-lg font-semibold tracking-tight">{context.work.title}</p>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={performance.progress} label="Avance de la obra" />
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {formatPercent(Math.min(performance.progress, 1))} ·{' '}
            {formatNumber(context.work.planned.plants - performance.plants)} plantas restantes
          </span>
        </div>
      </Panel>
      <Panel className="space-y-6 p-5">
        <CrewChecklist
          members={context.members}
          selected={form.workerIds}
          date={context.date}
          absences={workspace.absences}
          onToggle={(id) =>
            update({
              workerIds: form.workerIds.includes(id)
                ? form.workerIds.filter((item) => item !== id)
                : [...form.workerIds, id],
            })
          }
        />
        <div>
          <p className="mb-2 text-sm font-semibold">Plantas puestas</p>
          <StepperField
            label="Plantas puestas"
            value={form.plants}
            step={50}
            onChange={(plants) => update({ plants, hectares: hectaresFor(plants, context.work) })}
          />
          <p
            className={
              ratio < 0.9 ? 'mt-2 text-xs text-amber-800' : 'text-muted-foreground mt-2 text-xs'
            }
          >
            Ritmo del presupuesto para hoy: {formatNumber(context.target)} plantas (
            {formatNumber(ratio * 100)} %).
          </p>
        </div>
        <NumberField
          label="Superficie trabajada"
          suffix="ha"
          value={form.hectares}
          onChange={(hectares) => update({ hectares })}
        />
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Incidencias</legend>
          <div className="flex flex-wrap gap-2">
            {incidents.map((incident) => (
              <Button
                key={incident}
                aria-pressed={form.incident === incident}
                variant={form.incident === incident ? 'default' : 'outline'}
                onPress={() => update({ incident })}
              >
                {incidentLabels[incident]}
              </Button>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">Fotos del día</legend>
          <p className="text-muted-foreground text-xs">
            Opcional. El cliente las verá en el informe de la obra.
          </p>
          {form.photos.map((photo, index) => (
            <AttachmentField
              key={`${photo.name}-${index}`}
              label={`Foto ${index + 1}`}
              value={photo}
              onChange={(next) =>
                update({
                  photos: next
                    ? form.photos.map((item, at) => (at === index ? next : item))
                    : form.photos.filter((_item, at) => at !== index),
                })
              }
            />
          ))}
          {form.photos.length < MAX_REPORT_PHOTOS ? (
            <AttachmentField
              key={`new-${form.photos.length}`}
              label="Añadir foto"
              value={null}
              pickLabel="Hacer foto"
              onChange={(next) => next && update({ photos: [...form.photos, next] })}
            />
          ) : null}
        </fieldset>
        <div>
          <label htmlFor="report-notes" className="mb-2 block text-sm font-semibold">
            Notas
          </label>
          <Textarea
            id="report-notes"
            value={form.notes}
            onChange={(event) => update({ notes: event.target.value })}
            placeholder="Opcional: terreno, planta, accesos…"
            className="min-h-20"
          />
        </div>
      </Panel>
      {/* Stays above the phone dock so the foreman never has to scroll back to send the report. */}
      <div className="sticky-action mt-4">
        <Button
          onPress={send}
          className="h-14 w-full text-base shadow-lg lg:shadow-none"
          isDisabled={submit.isPending || form.workerIds.length === 0}
        >
          {saved ? <CheckCircle2 aria-hidden="true" className="size-5" /> : null}
          {saved ? 'Parte guardado · actualizar' : 'Enviar parte'}
        </Button>
      </div>
    </div>
  )
}
