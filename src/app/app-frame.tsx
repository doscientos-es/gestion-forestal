import {
  AppShell,
  AppShellContent,
  AppShellMain,
  AppShellMobileHeader,
  AppShellSidebar,
  Button,
  IconButton,
  Kbd,
  cn,
} from '@doscientos/ui'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowLeft, Search } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { useWorkspace, type Person } from '@/features/workspace'

import { MobileNavigation } from './mobile-navigation'
import { navigationCounts, pageTitle, parentDestination } from './navigation'
import { SearchDialog } from './search-dialog'
import { NavigationGroups, PrimaryShortcut, SeasonCard, UserHeader } from './sidebar-parts'

export function AppFrame({ user, children }: { user: Person; children: ReactNode }) {
  const workspace = useWorkspace()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const previousPath = useRef(pathname)
  const contentRef = useRef<HTMLDivElement>(null)
  const currentPage = pageTitle(pathname)
  const counts = navigationCounts(workspace, user)
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const parentSection = parentDestination(pathname)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement | null)?.closest(
        'input, textarea, select, [contenteditable]',
      )
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      } else if (event.key === '/' && !typing) {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.title = `${currentPage} · Gestión forestal`
    // Search/filter updates must not steal focus from the control being edited.
    if (previousPath.current !== pathname) {
      contentRef.current?.scrollTo({ top: 0 })
      contentRef.current?.focus({ preventScroll: true })
      previousPath.current = pathname
    }
  }, [pathname, currentPage])

  return (
    <div className="app-canvas">
      <AppShell className="app-frame" sidebarBreakpoint="lg">
        <a href="#main-content" className="skip-link">
          Saltar al contenido
        </a>
        <AppShellSidebar className="app-sidebar">
          <UserHeader user={user} />
          <Button
            variant="outline"
            className="text-muted-foreground w-full justify-start font-normal"
            onPress={() => setSearchOpen(true)}
          >
            <Search aria-hidden="true" className="size-4" />
            <span className="flex-1 text-left">Buscar…</span>
            <Kbd>Ctrl K</Kbd>
          </Button>
          <div className="sidebar-scroll">
            <NavigationGroups user={user} pathname={pathname} counts={counts} />
          </div>
          <div className="space-y-3">
            <div className="hide-short">
              <SeasonCard workspace={workspace} />
            </div>
            <PrimaryShortcut user={user} />
          </div>
        </AppShellSidebar>
        <AppShellMain className="app-main">
          <AppShellMobileHeader className="mobile-only bg-card border-border sticky top-0 z-10 flex items-center gap-1 border-b px-2 py-2">
            {parentSection ? (
              <IconButton
                label={`Volver a ${parentSection.label}`}
                variant="ghost"
                onPress={() => void navigate({ to: parentSection.to })}
              >
                <ArrowLeft aria-hidden="true" className="size-5" />
              </IconButton>
            ) : null}
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-base font-semibold',
                !parentSection && 'px-2',
              )}
            >
              {currentPage}
            </span>
            <IconButton label="Buscar" variant="ghost" onPress={() => setSearchOpen(true)}>
              <Search aria-hidden="true" className="size-5" />
            </IconButton>
          </AppShellMobileHeader>
          <AppShellContent
            ref={contentRef}
            id="main-content"
            tabIndex={-1}
            aria-label={currentPage}
            className="app-content"
          >
            <div className="mx-auto w-full max-w-360">{children}</div>
          </AppShellContent>
          <MobileNavigation user={user} pathname={pathname} counts={counts} />
        </AppShellMain>
      </AppShell>
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        user={user}
        workspace={workspace}
      />
    </div>
  )
}
