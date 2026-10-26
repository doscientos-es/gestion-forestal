import {
  Button,
  DataViewState,
  DataViewStateActions,
  DataViewStateDescription,
  DataViewStateTitle,
} from '@doscientos/ui'
import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'

import { AppFrame } from '@/app/app-frame'
import { defaultCustomerSearch } from '@/features/customers'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  errorComponent: RootError,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <AppFrame>
      <Outlet />
    </AppFrame>
  )
}

function RootError({ reset }: { reset: () => void }) {
  return (
    <AppFrame>
      <DataViewState aria-live="polite">
        <h1 className="sr-only">No se ha podido cargar esta pantalla</h1>
        <DataViewStateTitle>No se ha podido cargar esta pantalla</DataViewStateTitle>
        <DataViewStateDescription>
          Reintenta la operación o vuelve al listado.
        </DataViewStateDescription>
        <DataViewStateActions>
          <Button onPress={reset}>Reintentar</Button>
          <Link
            to="/"
            search={defaultCustomerSearch}
            className="focus-visible:outline-ring text-sm underline focus-visible:outline-2"
          >
            Volver al inicio
          </Link>
        </DataViewStateActions>
      </DataViewState>
    </AppFrame>
  )
}

function NotFound() {
  return (
    <DataViewState>
      <h1 className="sr-only">Página no encontrada</h1>
      <DataViewStateTitle>Página no encontrada</DataViewStateTitle>
      <DataViewStateDescription>
        La ruta solicitada no existe en esta aplicación.
      </DataViewStateDescription>
      <DataViewStateActions>
        <Link
          to="/"
          search={defaultCustomerSearch}
          className="focus-visible:outline-ring text-sm underline focus-visible:outline-2"
        >
          Volver al inicio
        </Link>
      </DataViewStateActions>
    </DataViewState>
  )
}
