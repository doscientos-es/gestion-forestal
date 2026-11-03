import { Button } from '@doscientos/ui'
import { useState } from 'react'

import { type ServiceIncident } from '@/features/workspace'
import { clock } from '@/shared/lib/clock'
import { useCommand } from '@/shared/lib/use-command'
import { NumberField, TextField } from '@/shared/ui/form-controls'
import { Panel, PanelHeader } from '@/shared/ui/surface'

import { incidentsApi } from '../api'
import { IncidentTextarea } from './incident-textarea'

export function IncidentActions({ incident }: { incident: ServiceIncident }) {
  const [visit, setVisit] = useState({ date: clock.today(), text: '', minutes: 0, material: '' })
  const [resolution, setResolution] = useState('')
  const add = useCommand(() => incidentsApi.addVisit(incident.id, visit), {
    success: 'Actuación registrada',
    onSuccess: () => setVisit({ date: clock.today(), text: '', minutes: 0, material: '' }),
  })
  const close = useCommand(() => incidentsApi.close(incident.id, resolution), { success: 'Incidencia cerrada', onSuccess: () => setResolution('') })
  const reopen = useCommand(() => incidentsApi.reopen(incident.id), { success: 'Incidencia reabierta' })
  const busy = add.isPending || close.isPending || reopen.isPending
  if (incident.status === 'cerrada') return (
    <Panel className="p-5">
      <h2 className="text-sm font-semibold">Incidencia resuelta</h2>
      <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">{incident.resolution}</p>
      <Button className="mt-4" variant="outline" isDisabled={busy} onPress={() => reopen.mutate(undefined)}>Reabrir incidencia</Button>
    </Panel>
  )
  return (
    <div className="space-y-5">
      <Panel aria-labelledby="incident-visit-title">
        <PanelHeader id="incident-visit-title" title="Registrar una actuación" description="Cada visita queda guardada con la fecha y la persona que la registra." />
        <form className="space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); if (!busy) add.mutate(undefined) }}>
          <fieldset disabled={busy} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Fecha de la actuación" type="date" min={incident.createdAt.slice(0, 10)} max={clock.today()} value={visit.date} onChange={(date) => setVisit({ ...visit, date })} required />
              <NumberField label="Tiempo empleado" suffix="min" value={visit.minutes} onChange={(minutes) => setVisit({ ...visit, minutes })} />
            </div>
            <IncidentTextarea label="Trabajo realizado *" value={visit.text} onChange={(text) => setVisit({ ...visit, text })} required />
            <IncidentTextarea label="Material empleado / observaciones" value={visit.material} maxLength={2000} onChange={(material) => setVisit({ ...visit, material })} />
          </fieldset>
          <Button type="submit" variant="outline" isDisabled={busy || !visit.text.trim()}>{add.isPending ? 'Guardando…' : 'Guardar actuación'}</Button>
        </form>
      </Panel>
      <Panel aria-labelledby="incident-close-title">
        <PanelHeader id="incident-close-title" title="Cerrar incidencia" description="Indica cómo se ha solucionado. Cerrar no factura ni crea un presupuesto automáticamente." />
        <form className="space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); if (!busy) close.mutate(undefined) }}>
          <fieldset disabled={busy}>
            <IncidentTextarea label="Solución aplicada *" value={resolution} onChange={setResolution} required />
          </fieldset>
          <Button type="submit" isDisabled={busy || !resolution.trim()}>{close.isPending ? 'Cerrando…' : 'Cerrar incidencia'}</Button>
        </form>
      </Panel>
    </div>
  )
}