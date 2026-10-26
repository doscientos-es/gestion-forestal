import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellSidebar,
  Badge,
} from '@doscientos/ui'
import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, type ReactNode } from 'react'

import { defaultCustomerSearch } from '@/features/customers'

const destinations = [
  { to: '/', label: 'Clientes', icon: 'customers' },
  { to: '/guia', label: 'Guía del starter', icon: 'guide' },
] as const

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const previousPath = useRef(pathname)
  const contentRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef(document.title)
  const currentPage = destinations.find((item) => item.to === pathname)?.label ?? 'Página'

  useEffect(() => {
    document.title = `${currentPage} · ${titleRef.current}`
    // Search/filter updates must not steal focus from the control being edited.
    if (previousPath.current !== pathname) {
      contentRef.current?.scrollTo({ top: 0 })
      contentRef.current?.focus({ preventScroll: true })
      previousPath.current = pathname
    }
    return () => {
      document.title = titleRef.current
    }
  }, [pathname, currentPage])

  return (
    <AppShell className="starter-shell">
      <a href="#main-content" className="starter-skip-link">
        Saltar al contenido
      </a>
      <AppShellSidebar className="starter-sidebar">
        <div className="px-5 py-6">
          <Link
            to="/"
            search={defaultCustomerSearch}
            className="starter-brand flex min-w-0 items-center gap-3 rounded-md"
          >
            <span
              aria-hidden="true"
              className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
            >
              o.
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight break-words">
                __APP_TITLE__
              </span>
              <span className="text-muted-foreground block text-xs">Espacio de trabajo</span>
            </span>
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3">
          <p className="text-muted-foreground px-3 pb-2 text-xs font-medium">Espacio de trabajo</p>
          <Navigation pathname={pathname} />
        </div>
        <div className="border-border mt-auto border-t px-5 py-4">
          <Badge variant="outline">Modo demostración</Badge>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            Datos sintéticos. Los cambios se pierden al recargar.
          </p>
        </div>
      </AppShellSidebar>
      <AppShellMain className="starter-main">
        <AppShellHeader className="shrink-0 justify-between gap-3">
          <div className="min-w-0 text-sm">
            <span className="block truncate font-semibold md:hidden">__APP_TITLE__</span>
            <span className="text-muted-foreground hidden md:inline">
              Espacio de trabajo{' '}
              <span aria-hidden="true" className="mx-2">
                /
              </span>
            </span>
            <span className="hidden font-medium md:inline">{currentPage}</span>
          </div>
          <Badge variant="outline" className="shrink-0">
            Demo
          </Badge>
        </AppShellHeader>
        <AppShellContent
          ref={contentRef}
          id="main-content"
          tabIndex={-1}
          aria-label={currentPage}
          className="starter-content"
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </AppShellContent>
        <Navigation pathname={pathname} mobile />
      </AppShellMain>
    </AppShell>
  )
}

function Navigation({ pathname, mobile = false }: { pathname: string; mobile?: boolean }) {
  return (
    <nav
      aria-label={mobile ? 'Navegación móvil' : 'Navegación principal'}
      className={mobile ? 'starter-mobile-nav' : 'space-y-1'}
    >
      {destinations.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          search={item.to === '/' ? defaultCustomerSearch : {}}
          aria-current={pathname === item.to ? 'page' : undefined}
          className="starter-nav-link"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 shrink-0"
          >
            {item.icon === 'customers' ? (
              <>
                <circle cx="9" cy="8" r="3" />
                <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2" />
              </>
            ) : (
              <>
                <path d="M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z" />
              </>
            )}
          </svg>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
