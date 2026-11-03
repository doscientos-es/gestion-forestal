import { Button } from '@doscientos/ui'
import { Link } from '@tanstack/react-router'
import { ClipboardList } from 'lucide-react'
import { useState } from 'react'

import { useCurrentUser, useWorkspace, type ServiceIncident } from '@/features/workspace'
import { formatDate, formatNumber } from '@/shared/lib/format'
import { useCommand } from '@/shared/lib/use-command'
import { ChoiceField } from '@/shared/ui/form-controls'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, PanelHeader, Tag } from '@/shared/ui/surface'

import { incidentsApi } from '../api'
import { incidentPriority, incidentStatus } from '../application/incident-presentation'
import { IncidentActions } from './incident-actions'

const linkClass = 'border-border hover:bg-muted inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium'

export function IncidentDetailPage({ incident }: { incident: ServiceIncident }) {
  const workspace = useWorkspace()
  const user = useCurrentUser()
  const [assignedTo, setAssignedTo] = useState(incident.assignedTo ?? 'none')
  const assign = useCommand(() => incidentsApi.assign(incident.id, assignedTo === 'none' ? null : assignedTo), { success: 'Responsable actualizado' })
  const client = workspace.clients.find((item) => item.id === incident.clientId)
  const budget = workspace.budgets.find((item) => item.incidentId === incident.id)
  const personName = (id: string | null) => workspace.people.find((person) => person.id === id)?.name ?? 'Sin asignar'
  const state = incidentStatus[incident.status]
  const minutes = incident.entries.reduce((sum, item) => sum + item.minutes, 0)
  const visits = incident.entries.filter((item) => item.kind === 'actuacion').length
  return (
    <>
      <PageTop back={{ to: '/incidencias', label: 'Volver a incidencias' }} title={incident.title}
        description={`${incident.code} · ${client?.name ?? ''} · Aviso del ${formatDate(incident.createdAt.slice(0, 10))}`}
        actions={user?.role === 'admin' ? <>
          <Link to="/clientes/$clientId" params={{ clientId: incident.clientId }} className={linkClass}>Ver cliente</Link>
          {budget ? <Link to="/presupuestos/$budgetId" params={{ budgetId: budget.id }} className={linkClass}>Ver presupuesto</Link> :
            <Link to="/presupuestos/nuevo" search={{ incidencia: incident.id }} className={linkClass}>Crear presupuesto</Link>}
        </> : undefined} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Tag tone={state.tone}>{state.label}</Tag>
        <Tag tone={incident.priority === 'urgente' ? 'red' : incident.priority === 'alta' ? 'amber' : 'gray'}>Prioridad {incidentPriority[incident.priority].toLowerCase()}</Tag>
        <span className="text-muted-foreground text-xs">{visits} actuaciones · {formatNumber(minutes)} min registrados</span>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel aria-labelledby="incident-info-title">
            <PanelHeader id="incident-info-title" title="Datos del aviso" icon={<ClipboardList className="size-5" />} />
            <div className="space-y-5 p-5">
              <p className="text-sm leading-relaxed whitespace-pre-line">{incident.description}</p>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                {[
                  ['Cliente', client?.name ?? 'Cliente no disponible'], ['Ubicación', incident.location || 'No indicada'],
                  ['Contacto', incident.contactName || 'No indicado'], ['Teléfono', incident.contactPhone || 'No indicado'],
                  ['Disponibilidad y acceso', incident.preferredTime || 'Sin instrucciones'], ['Responsable', personName(incident.assignedTo)],
                  ['Creada por', personName(incident.createdBy)],
                  ...(incident.closedAt ? [['Cerrada por', `${personName(incident.closedBy)} · ${formatDate(incident.closedAt.slice(0, 10))}`]] : []),
                ].map(([label, value]) => <div key={label}><dt className="text-muted-foreground text-xs">{label}</dt><dd className="mt-1 whitespace-pre-line">{value}</dd></div>)}
              </dl>
              {user?.role === 'admin' && incident.status !== 'cerrada' ? (
                <form className="border-border flex flex-wrap items-end gap-3 border-t pt-4" onSubmit={(event) => { event.preventDefault(); if (!assign.isPending) assign.mutate(undefined) }}>
                  <ChoiceField label="Asignar responsable" className="min-w-48 flex-1" value={assignedTo} onChange={setAssignedTo}
                    options={[{ value: 'none', label: 'Sin asignar' }, ...workspace.people.map((person) => ({ value: person.id, label: person.name }))]} />
                  <Button type="submit" variant="outline" isDisabled={assign.isPending || assignedTo === (incident.assignedTo ?? 'none')}>Guardar responsable</Button>
                </form>
              ) : null}
            </div>
          </Panel>
          <Panel aria-labelledby="incident-history-title">
            <PanelHeader id="incident-history-title" title="Historial de actuaciones" description="Visitas, trabajo realizado, material y cambios de estado." />
            {incident.entries.length === 0 ? <p className="text-muted-foreground p-5 text-sm">Todavía no hay actuaciones registradas.</p> : (
              <ol className="divide-border divide-y">
                {[...incident.entries].reverse().map((item) => <li key={item.id} className="space-y-2 p-5 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-medium">{{ actuacion: 'Actuación', cierre: 'Cierre', reapertura: 'Reapertura', asignacion: 'Asignación' }[item.kind]}</p>
                    <p className="text-muted-foreground text-xs">{formatDate(item.date)} · {personName(item.authorId)}</p>
                  </div>
                  <p className="whitespace-pre-line">{item.text}</p>
                  {item.minutes > 0 ? <p className="text-muted-foreground text-xs">Tiempo empleado: {formatNumber(item.minutes)} min</p> : null}
                  {item.material ? <p className="text-muted-foreground text-xs whitespace-pre-line">Material: {item.material}</p> : null}
                </li>)}
              </ol>
            )}
          </Panel>
        </div>
        <IncidentActions incident={incident} />
      </div>
    </>
  )
}