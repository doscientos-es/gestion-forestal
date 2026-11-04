import { useState, type FormEvent } from 'react'

import type { LineKind, Project, Workshop } from '../domain/model'
import { addProject, addQuoteLine, approveProject, finishProject, projectCosts, quoteTotal } from '../domain/workshop'
import { Badge, Empty, Field, Section, Status, eurosToCents, money, uid, type Change } from './shared'

export function ProjectsPage({ state, change, selected, select }: { state: Workshop; change: Change; selected: string; select: (id: string) => void }) {
  const [creating, setCreating] = useState(false)
  const project = state.projects.find((item) => item.id === selected) ?? state.projects[0]
  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const id = uid()
    const project: Project = { id, reference: `RR-${String(Date.now()).slice(-6)}`, client: String(data.get('client')).trim(), vehicle: String(data.get('vehicle')).trim(), plate: String(data.get('plate')).trim(), title: String(data.get('title')).trim(), status: 'presupuesto', lines: [] }
    if (change((current) => addProject(current, project))) { select(id); setCreating(false) }
  }
  return <div className="rr-stack">
    <div className="rr-heading"><div><span className="rr-eyebrow">DEL PRESUPUESTO A LA ENTREGA</span><h1>Proyectos de taller</h1><p>Cada vehículo, su presupuesto y el trabajo realizado en un solo lugar.</p></div><button className="rr-button" onClick={() => setCreating(!creating)}>{creating ? 'Cerrar' : '+ Nuevo proyecto'}</button></div>
    {creating && <Section title="Nuevo proyecto" subtitle="Datos de ejemplo: no introduzcas información real."><form className="rr-form-grid" onSubmit={create}>
      <Field label="Cliente"><input name="client" required placeholder="Nombre del cliente" /></Field><Field label="Vehículo"><input name="vehicle" required placeholder="Marca y modelo" /></Field><Field label="Matrícula o referencia"><input name="plate" required placeholder="Matrícula o referencia interna" /></Field><Field label="Trabajo"><input name="title" required placeholder="Preparación, revisión…" /></Field><button className="rr-button" type="submit">Crear proyecto</button>
    </form></Section>}
    <div className="rr-project-layout"><Section title="Proyectos" subtitle={`${state.projects.length} vehículos y trabajos`}><div className="rr-project-list">{state.projects.map((item) => <button key={item.id} className={`rr-project-item ${project?.id === item.id ? 'is-selected' : ''}`} onClick={() => select(item.id)}><span className="rr-project-top"><strong>{item.vehicle}</strong><Status status={item.status} /></span><span>{item.reference} · {item.plate}</span><small>{item.title}</small></button>)}</div></Section>
      {project ? <ProjectDetail key={project.id} project={project} state={state} change={change} /> : <Section title="Sin proyectos"><Empty>Crea el primer proyecto para empezar.</Empty></Section>}
    </div>
  </div>
}

function ProjectDetail({ project, state, change }: { project: Project; state: Workshop; change: Change }) {
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState<LineKind>('pieza')
  const costs = projectCosts(state.parts, project.id)
  const parts = state.parts.filter((item) => item.projectId === project.id)
  const invoices = state.invoices.filter((item) => item.projectId === project.id)
  const addLine = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (change((current) => addQuoteLine(current, project.id, { id: uid(), kind, description: String(data.get('description')).trim(), supplier: String(data.get('supplier') ?? '').trim(), quantity: Number(data.get('quantity')), price: eurosToCents(String(data.get('price'))) }))) setAdding(false)
  }
  return <div className="rr-stack"><Section title={project.title} subtitle={`${project.reference} · ${project.client} · ${project.vehicle} · ${project.plate}`} action={<Status status={project.status} />}>
    <div className="rr-metrics rr-metrics-small"><div><span>Presupuestado</span><strong>{money(quoteTotal(project.lines))}</strong><small>sin IVA</small></div><div><span>Coste registrado</span><strong>{money(costs.labor + costs.materials + costs.expenses)}</strong><small>{costs.hours} h imputadas</small></div><div><span>En borradores</span><strong>{money(invoices.reduce((sum, invoice) => sum + quoteTotal(invoice.lines), 0))}</strong><small>no son facturas fiscales</small></div></div>
    <div className="rr-section-line"><div><h3>Presupuesto</h3><p>Piezas y mano de obra · importes sin IVA</p></div>{project.status === 'presupuesto' && <button className="rr-button rr-button-light" onClick={() => setAdding(!adding)}>{adding ? 'Cancelar' : '+ Añadir partida'}</button>}</div>
    {project.lines.length ? <div className="rr-table-wrap"><table><thead><tr><th>Concepto</th><th>Proveedor</th><th>Cant.</th><th>Precio</th><th>Importe</th></tr></thead><tbody>{project.lines.map((line) => <tr key={line.id}><td><strong>{line.description}</strong><small>{line.kind}</small></td><td>{line.supplier || '—'}</td><td>{line.quantity}</td><td>{money(line.price)}</td><td>{money(line.price * line.quantity)}</td></tr>)}</tbody></table></div> : <Empty>Añade piezas o mano de obra al presupuesto.</Empty>}
    {adding && <form className="rr-form-grid rr-inline-form" onSubmit={addLine}><Field label="Tipo"><select value={kind} onChange={(event) => setKind(event.target.value as LineKind)}><option value="pieza">Pieza</option><option value="mano de obra">Mano de obra</option></select></Field><Field label="Concepto"><input name="description" required /></Field><Field label="Proveedor"><input name="supplier" placeholder="Opcional" /></Field><Field label="Cantidad"><input name="quantity" type="number" min="0.01" step="0.01" defaultValue="1" required /></Field><Field label="Precio unitario (€)"><input name="price" type="number" min="0" step="0.01" required /></Field><button className="rr-button" type="submit">Guardar partida</button></form>}
    <div className="rr-actions">{project.status === 'presupuesto' && <button className="rr-button" onClick={() => change((current) => approveProject(current, project.id))}>Aprobar y pasar a taller</button>}{project.status === 'en taller' && <button className="rr-button rr-button-light" onClick={() => change((current) => finishProject(current, project.id))}>Marcar trabajo terminado</button>}<span className="rr-hint">Aprobación registrada en esta demo; no se envía al cliente.</span></div>
  </Section><Section title="Actividad del taller" subtitle="Horas, piezas y gastos imputados a este proyecto.">{parts.length ? <div className="rr-list">{parts.map((part) => <div className="rr-list-row" key={part.id}><div><strong>{part.description}</strong><p>{part.worker} · {part.date} · {part.hours} h</p></div><Badge>{money(Math.round(part.hours * part.hourlyCost) + part.materialCost + part.expense)} coste</Badge></div>)}</div> : <Empty>Todavía no hay partes registrados.</Empty>}</Section></div>
}