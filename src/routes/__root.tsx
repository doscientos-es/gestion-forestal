import {
  Button,
  DataViewState,
  DataViewStateActions,
  DataViewStateDescription,
  DataViewStateTitle,
  Toaster,
} from '@doscientos/ui'
import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  errorComponent: RootError,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster position="bottom-right" />
    </>
  )
}

function RootError({ reset }: { reset: () => void }) {
  return (
    <main className="app-canvas flex items-center justify-center p-6">
      <DataViewState aria-live="polite" className="panel max-w-md p-8">
        <h1 className="sr-only">No se ha podido cargar esta pantalla</h1>
        <DataViewStateTitle>No se ha podido cargar esta pantalla</DataViewStateTitle>
        <DataViewStateDescription>
          Tus datos siguen guardados en este navegador. Reintenta o vuelve al inicio.
        </DataViewStateDescription>
        <DataViewStateActions>
          <Button onPress={reset}>Reintentar</Button>
          <Link
            to="/"
            className="focus-visible:outline-ring text-sm underline focus-visible:outline-2"
          >
            Volver al inicio
          </Link>
        </DataViewStateActions>
      </DataViewState>
    </main>
  )
}

function NotFound() {
  return (
    <DataViewState className="panel p-8">
      <h1 className="sr-only">Página no encontrada</h1>
      <DataViewStateTitle>Página no encontrada</DataViewStateTitle>
      <DataViewStateDescription>
        La ruta solicitada no existe en esta aplicación.
      </DataViewStateDescription>
      <DataViewStateActions>
        <Link
          to="/"
          className="focus-visible:outline-ring text-sm underline focus-visible:outline-2"
        >
          Volver al inicio
        </Link>
      </DataViewStateActions>
    </DataViewState>
  )
}
