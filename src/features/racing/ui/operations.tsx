import { useState, type FormEvent } from 'react'

import type { Workshop } from '../domain/model'
import { addPart } from '../domain/workshop'
import {
  Badge,
  Empty,
  Field,
  ProjectSelect,
  Section,
  eurosToCents,
  formText,
  money,
  today,
  uid,
  type Change,
} from './shared'

export function OperationsPage({ state, change }: { state: Workshop; change: Change }) {
  const [adding, setAdding] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [productId, setProductId] = useState('')
  const projects = state.projects.filter((item) => item.status === 'en taller')
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (
      change((current) =>
        addPart(current, {
          id: uid(),
          projectId,
          date: formText(data, 'date'),
          worker: formText(data, 'worker').trim(),
          description: formText(data, 'description').trim(),
          hours: Number(data.get('hours')),
          hourlyCost: eurosToCents(formText(data, 'hourlyCost')),
          productId: productId || null,
          quantity: productId ? Number(data.get('quantity')) : 0,
          expense: eurosToCents(formText(data, 'expense')),
        }),
      )
    ) {
      setAdding(false)
      setProjectId('')
      setProductId('')
    }
  }
  return (
    <div className="rr-stack">
      <div className="rr-heading">
        <div>
          <span className="rr-eyebrow">EL DÍA A DÍA DEL EQUIPO</span>
          <h1>Partes de taller</h1>
          <p>Registra intervenciones, horas, piezas y gastos por vehículo.</p>
        </div>
        <button className="rr-button" onClick={() => setAdding(!adding)}>
          {adding ? 'Cancelar' : '+ Registrar parte'}
        </button>
      </div>
      {adding && (
        <Section
          title="Nuevo parte"
          subtitle="Las horas se imputan al proyecto; esto no es un sistema de fichaje laboral."
        >
          <form className="rr-form-grid" onSubmit={save}>
            <Field label="Proyecto">
              <ProjectSelect projects={projects} value={projectId} onChange={setProjectId} />
            </Field>
            <Field label="Fecha">
              <input name="date" type="date" defaultValue={today()} required />
            </Field>
            <Field label="Operario">
              <input name="worker" placeholder="Nombre del operario" required />
            </Field>
            <Field label="Intervención">
              <input name="description" placeholder="Trabajo realizado" required />
            </Field>
            <Field label="Horas">
              <input name="hours" type="number" min="0.01" step="0.25" defaultValue="1" required />
            </Field>
            <Field label="Coste / hora (€)">
              <input
                name="hourlyCost"
                type="number"
                min="0"
                step="0.01"
                defaultValue="24"
                required
              />
            </Field>
            <Field label="Pieza consumida (opcional)">
              <select value={productId} onChange={(event) => setProductId(event.target.value)}>
                <option value="">Sin pieza</option>
                {state.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {product.stock} disponibles
                  </option>
                ))}
              </select>
            </Field>
            {productId && (
              <Field label="Cantidad consumida">
                <input name="quantity" type="number" min="1" step="1" defaultValue="1" required />
              </Field>
            )}
            <Field label="Otros gastos (€)">
              <input name="expense" type="number" min="0" step="0.01" defaultValue="0" required />
            </Field>
            <button className="rr-button">Guardar parte</button>
          </form>
        </Section>
      )}
      <Section
        title="Últimas intervenciones"
        subtitle="El coste incluye las horas, las piezas consumidas y otros gastos registrados."
      >
        {state.parts.length ? (
          <div className="rr-list">
            {state.parts.map((part) => {
              const project = state.projects.find((item) => item.id === part.projectId)
              const product = state.products.find((item) => item.id === part.productId)
              return (
                <div className="rr-list-row" key={part.id}>
                  <div>
                    <strong>{part.description}</strong>
                    <p>
                      {project?.reference} · {project?.vehicle} · {part.worker} · {part.date}
                    </p>
                    <p>
                      {part.hours} h {product && `· ${part.quantity} × ${product.name}`}
                    </p>
                  </div>
                  <Badge>
                    {money(
                      Math.round(part.hours * part.hourlyCost) + part.materialCost + part.expense,
                    )}{' '}
                    coste
                  </Badge>
                </div>
              )
            })}
          </div>
        ) : (
          <Empty>Aún no hay partes registrados.</Empty>
        )}
      </Section>
    </div>
  )
}

export function TeamPage({ state, change }: { state: Workshop; change: Change }) {
  const [adding, setAdding] = useState(false)
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const worker = formText(data, 'worker').trim()
    const from = formText(data, 'from')
    const to = formText(data, 'to')
    if (
      change((current) => {
        if (!worker || !from || !to || to < from)
          throw new Error('Revisa el operario y las fechas de vacaciones.')
        return { ...current, absences: [{ id: uid(), worker, from, to }, ...current.absences] }
      })
    )
      setAdding(false)
  }
  return (
    <div className="rr-stack">
      <div className="rr-heading">
        <div>
          <span className="rr-eyebrow">PERSONAS</span>
          <h1>Equipo y vacaciones</h1>
          <p>Un registro sencillo de ausencias para coordinar el taller.</p>
        </div>
        <button className="rr-button" onClick={() => setAdding(!adding)}>
          {adding ? 'Cancelar' : '+ Añadir vacaciones'}
        </button>
      </div>
      {adding && (
        <Section title="Registrar vacaciones">
          <form className="rr-form-grid" onSubmit={save}>
            <Field label="Operario">
              <input name="worker" required />
            </Field>
            <Field label="Desde">
              <input name="from" type="date" required />
            </Field>
            <Field label="Hasta">
              <input name="to" type="date" required />
            </Field>
            <button className="rr-button">Guardar vacaciones</button>
          </form>
        </Section>
      )}
      <Section
        title="Vacaciones registradas"
        subtitle="Ejemplo local, sin gestión laboral ni aprobación de solicitudes."
      >
        {state.absences.length ? (
          <div className="rr-list">
            {state.absences.map((absence) => (
              <div className="rr-list-row" key={absence.id}>
                <div>
                  <strong>{absence.worker}</strong>
                  <p>
                    {absence.from} → {absence.to}
                  </p>
                </div>
                <Badge>Vacaciones</Badge>
              </div>
            ))}
          </div>
        ) : (
          <Empty>No hay vacaciones registradas.</Empty>
        )}
      </Section>
    </div>
  )
}
