import {
  Bell,
  Calculator,
  CalendarRange,
  ClipboardCheck,
  History,
  Landmark,
  House,
  Receipt,
  Settings,
  Sprout,
  Sun,
  TreePine,
  UserRound,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'

import {
  canAccess,
  overdueInvoices,
  type Area,
  type Person,
  type Workspace,
} from '@/features/workspace'
import { clock } from '@/shared/lib/clock'

export type Destination = {
  area: Area
  to:
    | '/'
    | '/presupuestos'
    | '/obras'
    | '/planificacion'
    | '/parte'
    | '/ausencias'
    | '/gastos'
    | '/avisos'
    | '/facturas'
    | '/contabilidad'
    | '/catalogo'
    | '/cuadrillas'
    | '/clientes'
    | '/actividad'
  label: string
  short: string
  icon: LucideIcon
  group: 'Operativa' | 'Administración'
}

export const destinations: Destination[] = [
  {
    area: 'inicio',
    to: '/',
    label: 'Inicio',
    short: 'Inicio',
    icon: House,
    group: 'Operativa',
  },
  {
    area: 'presupuestos',
    to: '/presupuestos',
    label: 'Presupuestos',
    short: 'Presup.',
    icon: Calculator,
    group: 'Operativa',
  },
  {
    area: 'obras',
    to: '/obras',
    label: 'Obras',
    short: 'Obras',
    icon: TreePine,
    group: 'Operativa',
  },
  {
    area: 'planificacion',
    to: '/planificacion',
    label: 'Planificación',
    short: 'Plan',
    icon: CalendarRange,
    group: 'Operativa',
  },
  {
    area: 'parte',
    to: '/parte',
    label: 'Parte diario',
    short: 'Parte',
    icon: ClipboardCheck,
    group: 'Operativa',
  },
  {
    area: 'gastos',
    to: '/gastos',
    label: 'Gastos',
    short: 'Gastos',
    icon: WalletCards,
    group: 'Operativa',
  },
  {
    area: 'ausencias',
    to: '/ausencias',
    label: 'Vacaciones y ausencias',
    short: 'Ausencias',
    icon: Sun,
    group: 'Operativa',
  },
  {
    area: 'avisos',
    to: '/avisos',
    label: 'Avisos',
    short: 'Avisos',
    icon: Bell,
    group: 'Operativa',
  },
  {
    area: 'facturas',
    to: '/facturas',
    label: 'Facturas',
    short: 'Facturas',
    icon: Receipt,
    group: 'Administración',
  },
  {
    area: 'contabilidad',
    to: '/contabilidad',
    label: 'Contabilidad e informes',
    short: 'Conta',
    icon: Landmark,
    group: 'Administración',
  },
  {
    area: 'catalogo',
    to: '/catalogo',
    label: 'Catálogo',
    short: 'Catálogo',
    icon: Sprout,
    group: 'Administración',
  },
  {
    area: 'cuadrillas',
    to: '/cuadrillas',
    label: 'Cuadrillas',
    short: 'Equipos',
    icon: UsersRound,
    group: 'Administración',
  },
  {
    area: 'clientes',
    to: '/clientes',
    label: 'Clientes',
    short: 'Clientes',
    icon: UserRound,
    group: 'Administración',
  },
  {
    area: 'actividad',
    to: '/actividad',
    label: 'Actividad',
    short: 'Actividad',
    icon: History,
    group: 'Administración',
  },
]

/** Small counters next to each destination, scoped to what the user can act on. */
export function navigationCounts(
  workspace: Workspace,
  user: Person,
): Partial<Record<Area, number>> {
  const avisos = workspace.notifications.filter(
    (item) => item.personId === user.id && !item.read,
  ).length
  if (user.role === 'admin') {
    return {
      presupuestos: workspace.budgets.filter(
        (b) => b.status === 'borrador' || b.status === 'enviado',
      ).length,
      obras: workspace.works.filter((w) => w.status !== 'facturada').length,
      ausencias: workspace.absences.filter((a) => a.status === 'solicitada').length,
      gastos: workspace.expenses.filter((e) => e.status === 'pendiente').length,
      facturas: workspace.invoices.filter((i) => i.status === 'borrador').length,
      // Clients with a sent invoice still unpaid after 30 days.
      clientes: new Set(
        overdueInvoices(workspace, clock.today()).map((item) => item.invoice.clientId),
      ).size,
      avisos,
    }
  }
  const own = workspace.absences.filter((a) => a.personId === user.id && a.status === 'solicitada')
  const mine = workspace.works.filter(
    (work) =>
      workspace.assignments.some(
        (assignment) => assignment.workId === work.id && assignment.crewId === user.crewId,
      ) &&
      (work.status === 'en_curso' || work.status === 'planificada'),
  )
  const rejected = workspace.expenses.filter(
    (e) => e.createdBy === user.id && e.status === 'rechazado',
  ).length
  return {
    obras: mine.length,
    ausencias: own.length,
    gastos: rejected,
    avisos,
  }
}

export function isActive(to: string, pathname: string) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to)
}

type SectionId = 'equipo' | 'facturacion' | 'ajustes'

/**
 * Related pages share one sidebar entry and show their siblings as tabs at the top. This keeps
 * the menu short (7 entries for the office) while every page keeps its own route.
 */
const sections: Record<
  SectionId,
  { label: string; short: string; icon: LucideIcon; tabs: { area: Area; label: string }[] }
> = {
  equipo: {
    label: 'Equipo',
    short: 'Equipo',
    icon: UsersRound,
    tabs: [
      { area: 'cuadrillas', label: 'Cuadrillas' },
      { area: 'ausencias', label: 'Ausencias' },
    ],
  },
  facturacion: {
    label: 'Facturación',
    short: 'Factur.',
    icon: Receipt,
    tabs: [
      { area: 'facturas', label: 'Facturas' },
      { area: 'gastos', label: 'Gastos' },
      { area: 'contabilidad', label: 'Contabilidad' },
    ],
  },
  ajustes: {
    label: 'Ajustes',
    short: 'Ajustes',
    icon: Settings,
    tabs: [
      { area: 'catalogo', label: 'Catálogo' },
      { area: 'actividad', label: 'Actividad' },
    ],
  },
}

/** Order of the sidebar. Notices live in the bell, not here. */
const layout: (Area | SectionId)[] = [
  'inicio',
  'presupuestos',
  'obras',
  'planificacion',
  'parte',
  'clientes',
  'equipo',
  'facturacion',
  'ajustes',
]

export type NavItem = {
  key: string
  to: Destination['to']
  label: string
  short: string
  icon: LucideIcon
  group: Destination['group']
  /** Every area the entry covers: its own, or those of its tabs. */
  areas: Area[]
}

const destinationOf = (area: Area) => destinations.find((item) => item.area === area)

const isSection = (slot: Area | SectionId): slot is SectionId => slot in sections

/** Pages of a section the user can open, in tab order. */
function accessibleTabs(user: Person, id: SectionId) {
  return sections[id].tabs.flatMap((tab) => {
    const destination = destinationOf(tab.area)
    return destination && canAccess(user.role, tab.area) ? [{ ...tab, to: destination.to }] : []
  })
}

/**
 * Sidebar entries for a person. A section with several pages they can open becomes one entry;
 * with a single page (a foreman's «Gastos») it is shown as that page.
 */
export function navItems(user: Person): NavItem[] {
  return layout.flatMap((slot): NavItem[] => {
    if (!isSection(slot)) {
      const destination = destinationOf(slot)
      return destination && canAccess(user.role, slot)
        ? [{ ...destination, key: slot, areas: [slot] }]
        : []
    }
    const tabs = accessibleTabs(user, slot)
    const first = tabs[0]
    if (!first) return []
    if (tabs.length === 1) {
      const destination = destinationOf(first.area)
      return destination ? [{ ...destination, key: first.area, areas: [first.area] }] : []
    }
    const { label, short, icon } = sections[slot]
    const areas = tabs.map((tab) => tab.area)
    return [{ key: slot, to: first.to, label, short, icon, group: 'Administración', areas }]
  })
}

export function itemCount(item: NavItem, counts: Partial<Record<Area, number>>) {
  return item.areas.reduce((sum, area) => sum + (counts[area] ?? 0), 0)
}

export function isItemActive(item: NavItem, pathname: string) {
  return item.areas.some((area) => {
    const destination = destinationOf(area)
    return destination ? isActive(destination.to, pathname) : false
  })
}

/** Tabs to show above the page when it belongs to a section with several pages; else null. */
export function sectionTabs(user: Person, pathname: string) {
  for (const id of Object.keys(sections) as SectionId[]) {
    const tabs = accessibleTabs(user, id)
    if (tabs.length > 1 && tabs.some((tab) => isActive(tab.to, pathname)))
      return {
        label: sections[id].label,
        tabs,
        active: tabs.find((tab) => isActive(tab.to, pathname))?.to ?? tabs[0]?.to,
      }
  }
  return null
}

/** On a detail page (e.g. /obras/123) the section it belongs to, so mobile can offer "back". */
export function parentDestination(pathname: string) {
  return destinations.find(
    (item) =>
      item.to !== '/' && pathname.startsWith(`${item.to}/`) && pathname.length > item.to.length + 1,
  )
}

export function pageTitle(pathname: string) {
  const match = [...destinations]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => (item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)))
  return match?.label ?? 'Gestión forestal'
}
