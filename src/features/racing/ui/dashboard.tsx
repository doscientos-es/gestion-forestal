import { ArrowRight, ClipboardList, Package, Timer, Wallet } from 'lucide-react'

import type { Workshop } from '../domain/model'
import { projectCosts, quoteTotal } from '../domain/workshop'
import { Badge, Section, Status, money } from './shared'

export type Page =
  | 'inicio'
  | 'proyectos'
  | 'taller'
  | 'inventario'
  | 'compras'
  | 'facturacion'
  | 'equipo'
  | 'asistente'

export function Dashboard({
  state,
  navigate,
  select,
}: {
  state: Workshop
  navigate: (page: Page) => void
  select: (id: string) => void
}) {
  const active = state.projects.filter((project) => project.status === 'en taller')
  const budgets = state.projects.filter((project) => project.status === 'presupuesto')
  const lowStock = state.products.filter((product) => product.stock <= product.minimum)
  const pending = state.purchases.filter((purchase) => purchase.status === 'pendiente')
  return (
    <div className="rr-stack rr-dashboard">
      <div className="rr-heading">
        <div>
          <span className="rr-eyebrow">EL TALLER, BAJO CONTROL</span>
          <h1>Bon dia, equipo.</h1>
          <p>Una visión clara de los vehículos, las piezas y el trabajo pendiente.</p>
        </div>
        <div className="rr-date">DEMO · RIERA RACING</div>
      </div>
      <div className="rr-metrics rr-dashboard-metrics">
        <div>
          <ClipboardList />
          <span>Vehículos en taller</span>
          <strong>{active.length}</strong>
          <small>proyectos en marcha</small>
        </div>
        <div>
          <Timer />
          <span>Presupuestos pendientes</span>
          <strong>{budgets.length}</strong>
          <small>por revisar y aprobar</small>
        </div>
        <div>
          <Package />
          <span>Piezas a reponer</span>
          <strong>{lowStock.length}</strong>
          <small>en o bajo el mínimo</small>
        </div>
        <div>
          <Wallet />
          <span>Pedidos pendientes</span>
          <strong>{pending.length}</strong>
          <small>por recibir</small>
        </div>
      </div>
      <div className="rr-hero">
        <div>
          <span className="rr-eyebrow">DE LA IDEA A LA PISTA</span>
          <h2>Todo el trabajo de cada vehículo, conectado.</h2>
          <p>
            Presupuesta, registra las horas y controla cada pieza sin perder el hilo del proyecto.
          </p>
          <button className="rr-button rr-button-white" onClick={() => navigate('proyectos')}>
            Ver proyectos <ArrowRight size={16} />
          </button>
        </div>
        <div className="rr-hero-number">
          RR<span> / 01</span>
        </div>
      </div>
      <div className="rr-two-col">
        <Section
          title="En marcha"
          subtitle="Trabajos activos en el taller"
          action={
            <button className="rr-text-button" onClick={() => navigate('proyectos')}>
              Ver todos →
            </button>
          }
        >
          <div className="rr-list">
            {active.map((project) => {
              const costs = projectCosts(state.parts, project.id)
              return (
                <button
                  className="rr-list-row rr-click-row"
                  key={project.id}
                  onClick={() => {
                    select(project.id)
                    navigate('proyectos')
                  }}
                >
                  <div>
                    <strong>{project.vehicle}</strong>
                    <p>
                      {project.reference} · {project.title}
                    </p>
                    <p>
                      {costs.hours} h registradas · Presupuesto {money(quoteTotal(project.lines))}
                    </p>
                  </div>
                  <Status status={project.status} />
                </button>
              )
            })}
            {!active.length && <p className="rr-empty">No hay proyectos en taller.</p>}
          </div>
        </Section>
        <Section title="Atención" subtitle="Lo que conviene revisar hoy">
          <div className="rr-list">
            <button className="rr-list-row rr-click-row" onClick={() => navigate('inventario')}>
              <div>
                <strong>Stock por revisar</strong>
                <p>
                  {lowStock.length
                    ? lowStock.map((product) => product.name).join(', ')
                    : 'Sin avisos de stock'}
                </p>
              </div>
              <Badge tone={lowStock.length ? 'amber' : 'green'}>{lowStock.length}</Badge>
            </button>
            <button className="rr-list-row rr-click-row" onClick={() => navigate('compras')}>
              <div>
                <strong>Recepciones pendientes</strong>
                <p>Comprueba cantidades antes de actualizar almacén.</p>
              </div>
              <Badge tone="amber">{pending.length}</Badge>
            </button>
            <button className="rr-list-row rr-click-row" onClick={() => navigate('asistente')}>
              <div>
                <strong>Asistente de ejemplo</strong>
                <p>Visualiza el flujo propuesto de voz y documentos.</p>
              </div>
              <Badge>Simulado</Badge>
            </button>
          </div>
        </Section>
      </div>
    </div>
  )
}
