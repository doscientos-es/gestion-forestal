import {
  Bot,
  Boxes,
  CalendarDays,
  ClipboardList,
  FileText,
  Gauge,
  ShoppingCart,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { loadWorkshop, saveWorkshop, WORKSHOP_KEY } from '../api'
import type { Workshop } from '../domain/model'
import { AssistantPage } from './assistant'
import { BillingPage } from './billing'
import { Dashboard, type Page } from './dashboard'
import { InventoryPage, PurchasesPage } from './inventory'
import { OperationsPage, TeamPage } from './operations'
import { ProjectsPage } from './projects'
import type { Change } from './shared'

const navigation: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: 'inicio', label: 'Inicio', icon: Gauge },
  { id: 'proyectos', label: 'Proyectos', icon: ClipboardList },
  { id: 'taller', label: 'Partes de taller', icon: Wrench },
  { id: 'inventario', label: 'Inventario', icon: Boxes },
  { id: 'compras', label: 'Compras', icon: ShoppingCart },
  { id: 'facturacion', label: 'Facturación', icon: FileText },
  { id: 'equipo', label: 'Equipo', icon: CalendarDays },
  { id: 'asistente', label: 'Asistente IA', icon: Bot },
]

type Loaded = { state: Workshop; error: null } | { state: null; error: string }
function read(): Loaded {
  try {
    return { state: loadWorkshop(window.localStorage), error: null }
  } catch {
    return {
      state: null,
      error:
        'No se han podido leer los datos locales. Comprueba que el navegador permite el almacenamiento o restablece la demo.',
    }
  }
}

export function RacingApp() {
  const [loaded, setLoaded] = useState<Loaded>(read)
  const [page, setPage] = useState<Page>('inicio')
  const [selected, setSelected] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === WORKSHOP_KEY) setLoaded(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  const reset = () => {
    if (
      !window.confirm('¿Restablecer la demo? Se perderán los cambios guardados en este navegador.')
    )
      return
    try {
      window.localStorage.removeItem(WORKSHOP_KEY)
      setLoaded(read())
      setSelected('')
      setPage('inicio')
      setMessage('Datos de ejemplo restablecidos.')
    } catch {
      setMessage('No se han podido restablecer los datos locales.')
    }
  }
  const change: Change = (command) => {
    if (!loaded.state) return false
    try {
      const next = command(loaded.state)
      saveWorkshop(window.localStorage, next)
      setLoaded({ state: next, error: null })
      setMessage('Cambios guardados en este navegador.')
      return true
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se han podido guardar los cambios.')
      return false
    }
  }
  if (!loaded.state)
    return (
      <main className="rr-failure">
        <h1>No se puede abrir la demo</h1>
        <p>{loaded.error}</p>
        <button className="rr-button" onClick={reset}>
          Restablecer datos de ejemplo
        </button>
        <output>{message}</output>
      </main>
    )
  const state = loaded.state
  return (
    <div className="rr-app">
      <a className="rr-skip" href="#contenido">
        Saltar al contenido
      </a>
      <aside className="rr-sidebar">
        <div className="rr-brand">
          <img className="rr-brand-logo" src="/icon.png" alt="Riera Racing" />
          <small>GESTIÓN DE TALLER</small>
        </div>
        <div className="rr-sidebar-label">ESPACIO DE TRABAJO</div>
        <nav aria-label="Navegación principal">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={page === id ? 'active' : ''}
              onClick={() => setPage(id)}
              aria-current={page === id ? 'page' : undefined}
            >
              <Icon size={18} />
              {label}
              {id === 'asistente' && <span className="rr-nav-badge">DEMO</span>}
            </button>
          ))}
        </nav>
        <div className="rr-sidebar-footer">
          <div className="rr-demo-dot">Entorno de demostración</div>
          <p>Datos ficticios guardados solo en este navegador.</p>
          <button onClick={reset}>Restablecer datos de ejemplo</button>
        </div>
      </aside>
      <div className="rr-main">
        <header className="rr-topbar">
          <div>
            <img className="rr-mobile-brand" src="/icon.png" alt="" />
            <span>Riera Racing</span>
            <span className="rr-top-divider">/</span>
            <strong>{navigation.find((item) => item.id === page)?.label}</strong>
          </div>
          <span className="rr-top-demo">
            DEMO LOCAL <span />
          </span>
        </header>
        <main id="contenido" className="rr-content">
          <div className="rr-mobile-nav" aria-label="Secciones">
            {navigation.map(({ id, label }) => (
              <button
                key={id}
                className={page === id ? 'active' : ''}
                onClick={() => setPage(id)}
                aria-current={page === id ? 'page' : undefined}
              >
                {label}
              </button>
            ))}
          </div>
          {message && (
            <output className="rr-message">
              <span>{message}</span>
              <button aria-label="Cerrar aviso" onClick={() => setMessage('')}>
                ×
              </button>
            </output>
          )}
          {page === 'inicio' && <Dashboard state={state} navigate={setPage} select={setSelected} />}
          {page === 'proyectos' && (
            <ProjectsPage state={state} change={change} selected={selected} select={setSelected} />
          )}
          {page === 'taller' && <OperationsPage state={state} change={change} />}
          {page === 'inventario' && <InventoryPage state={state} change={change} />}
          {page === 'compras' && <PurchasesPage state={state} change={change} />}
          {page === 'facturacion' && <BillingPage state={state} change={change} />}
          {page === 'equipo' && <TeamPage state={state} change={change} />}
          {page === 'asistente' && <AssistantPage />}
          <footer className="rr-footer">
            Prototipo de demostración · Datos ficticios · Sin conexiones externas
            <button className="rr-reset-mobile" onClick={reset}>
              Restablecer datos de ejemplo
            </button>
          </footer>
        </main>
      </div>
    </div>
  )
}
