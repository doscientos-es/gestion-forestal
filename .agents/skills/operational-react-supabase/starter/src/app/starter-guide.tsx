import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
  PageHeaderTitle,
} from '@doscientos/ui'
import { Link } from '@tanstack/react-router'

const scenarios = [
  { value: 'default', label: 'Listado', description: 'Filtros, resumen y ficha de detalle.' },
  { value: 'loading', label: 'Carga', description: 'Esqueletos con la forma de las filas.' },
  {
    value: 'empty',
    label: 'Vacío',
    description: 'Un siguiente paso claro, sin perder los filtros.',
  },
  { value: 'error', label: 'Error', description: 'Mensaje recuperable y acción de reintento.' },
  {
    value: 'long',
    label: 'Contenido largo',
    description: 'Nombres y emails que deben envolver sin desbordar.',
  },
] as const

export function StarterGuide() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderHeading>
          <PageHeaderTitle>Un buen punto de partida</PageHeaderTitle>
          <PageHeaderDescription>
            Adapta la marca y el primer flujo sin reconstruir los componentes.
          </PageHeaderDescription>
        </PageHeaderHeading>
      </PageHeader>
      <section
        aria-labelledby="recipes-title"
        className="border-border bg-card overflow-hidden rounded-lg border"
      >
        <div className="border-border border-b px-5 py-4">
          <h2 id="recipes-title" className="text-sm font-semibold">
            Pantallas y estados listos para adaptar
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Ejemplos sintéticos. No se conectan a ningún backend.
          </p>
        </div>
        <ul className="divide-border divide-y">
          {scenarios.map((scenario) => (
            <li key={scenario.value}>
              <Link
                to="/"
                search={{ q: '', status: 'all', scenario: scenario.value }}
                className="hover:bg-muted focus-visible:outline-ring flex min-h-16 items-center justify-between gap-4 px-5 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium">{scenario.label}</span>
                  <p className="text-muted-foreground mt-1 text-sm">{scenario.description}</p>
                </div>
                <span aria-hidden="true" className="text-muted-foreground">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="adapt-title" className="space-y-4">
        <h2 id="adapt-title" className="text-sm font-semibold">
          Antes de convertirlo en tu producto
        </h2>
        <ol className="text-muted-foreground grid gap-4 text-sm sm:grid-cols-2">
          <li>
            <strong className="text-foreground block">1. Define tu marca</strong>Los colores, radios
            y tipografía viven en <code>src/styles.css</code>. Verifica el contraste al cambiarlos.
            La fuente de sistema no necesita descargas externas.
          </li>
          <li>
            <strong className="text-foreground block">2. Adapta el primer flujo</strong>Listado,
            filtros en la URL, formulario y detalle ya están conectados. Las altas son temporales y
            desaparecen al recargar.
          </li>
          <li>
            <strong className="text-foreground block">3. Comprueba la experiencia</strong>Recorre
            con Tab, abre y cierra diálogos con teclado, prueba a 375px y con zoom al 200%. El foco
            debe seguir visible.
          </li>
          <li>
            <strong className="text-foreground block">4. Conecta datos de forma segura</strong>
            Aprueba el modelo, permisos y políticas RLS antes de sustituir los adaptadores de
            demostración.
          </li>
        </ol>
      </section>
    </div>
  )
}
