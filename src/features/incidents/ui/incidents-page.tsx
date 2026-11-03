import { Button } from '@doscientos/ui'
import { Link, useNavigate } from '@tanstack/react-router'
import { ClipboardList, Plus } from 'lucide-react'
import { useState } from 'react'

import { useCurrentUser, useWorkspace, visibleIncidents, type ServiceIncident } from '@/features/workspace'
import { formatDate } from '@/shared/lib/format'
import { EmptyPanel } from '@/shared/ui/empty-panel'
import { ChoiceField, TextField } from '@/shared/ui/form-controls'
import { PageTop } from '@/shared/ui/page-top'
import { Panel, Tag } from '@/shared/ui/surface'

import { incidentPriority, incidentStatus } from '../application/incident-presentation'
import { IncidentCreateDialog } from './incident-create-dialog'

export function IncidentsPage({ clientId }: { clientId?: string }) {
  const workspace = useWorkspace()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('activas')
  const [selectedClient, setSelectedClient] = useState(clientId ?? 'todos')
  if (!user) return null
  const incidents = visibleIncidents(workspace, user)
  const filtered = incidents.filter((item) => {
    if (selectedClient !== 'todos' && item.clientId !== selectedClient) return false
    if (status === 'activas' ? item.status === 'cerrada' : status !== 'todas' && item.status !== status) return false
    const client = workspace.clients.find((entry) => entry.id === item.clientId)
    return `${item.code} ${item.title} ${client?.name ?? ''} ${item.location}`.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es'))
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const open = incidents.filter((item) => item.status !== 'cerrada').length
  function created(incident: ServiceIncident) {
    setCreating(false)
    void navigate({ to: '/incidencias/$incidentId', params: { incidentId: incident.id } })
  }
  return (
    <>
      <PageTop title="Incidencias" description={user.role === 'admin' ? 'Avisos de clientes, actuaciones y oportunidades de presupuesto.' : 'Tus avisos y los que tienes asignados. Registra las actuaciones y cierra con la solución.'}
        actions={<Button onPress={() => setCreating(true)}><Plus aria-hidden="true" className="size-4" /> Nueva incidencia</Button>} />
      <Panel>
        <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Seguimiento de avisos</h2>
          <Tag tone={open ? 'amber' : 'gray'}>{open} pendientes · {incidents.length} en total</Tag>
        </div>
        <div className="border-border grid gap-3 border-b p-5 sm:grid-cols-3">
          <TextField label="Buscar incidencia" placeholder="Asunto, referencia o cliente" value={query} onChange={setQuery} />
          <ChoiceField label="Estado" value={status} onChange={setStatus} options={[
            { value: 'activas', label: 'Pendientes de cerrar' }, { value: 'todas', label: 'Todos los estados' },
            ...Object.entries(incidentStatus).map(([value, item]) => ({ value, label: item.label })),
          ]} />
          <ChoiceField label="Cliente" value={selectedClient} onChange={setSelectedClient}
            options={[{ value: 'todos', label: 'Todos los clientes' }, ...workspace.clients.map((client) => ({ value: client.id, label: client.name }))]} />
        </div>
        {filtered.length === 0 ? <EmptyPanel icon={<ClipboardList className="size-5" />} title="No hay incidencias en esta vista"
          description="Cambia los filtros o registra un nuevo aviso de un cliente."
          action={<Button variant="outline" onPress={() => setCreating(true)}>Crear incidencia</Button>} /> : (
          <ul className="divide-border divide-y">
            {filtered.map((incident) => {
              const state = incidentStatus[incident.status]
              return <li key={incident.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <Link to="/incidencias/$incidentId" params={{ incidentId: incident.id }} className="min-w-0 flex-1 text-sm font-semibold hover:underline">
                  {incident.title}
                  <span className="text-muted-foreground mt-1 block text-xs font-normal">{incident.code} · {workspace.clients.find((client) => client.id === incident.clientId)?.name}</span>
                </Link>
                <div className="text-muted-foreground text-right text-xs">
                  <p>{workspace.people.find((person) => person.id === incident.assignedTo)?.name ?? 'Sin asignar'}</p>
                  <p className="mt-1">{formatDate(incident.createdAt.slice(0, 10))}</p>
                </div>
                {incident.priority !== 'normal' ? <Tag tone={incident.priority === 'urgente' ? 'red' : 'amber'}>{incidentPriority[incident.priority]}</Tag> : null}
                <Tag tone={state.tone}>{state.label}</Tag>
              </li>
            })}
          </ul>
        )}
      </Panel>
      {creating ? <IncidentCreateDialog {...(selectedClient !== 'todos' ? { clientId: selectedClient } : {})} onClose={() => setCreating(false)} onCreated={created} /> : null}
    </>
  )
}