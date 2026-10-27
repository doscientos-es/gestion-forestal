import {
  Bell,
  Calculator,
  CalendarRange,
  ChartColumn,
  ClipboardCheck,
  History,
  Landmark,
  House,
  Receipt,
  Sprout,
  Sun,
  TreePine,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import type { Area, Person, Workspace } from "@/features/workspace";

export type Destination = {
  area: Area;
  to:
    | "/"
    | "/presupuestos"
    | "/obras"
    | "/planificacion"
    | "/parte"
    | "/ausencias"
    | "/gastos"
    | "/avisos"
    | "/facturas"
    | "/contabilidad"
    | "/catalogo"
    | "/cuadrillas"
    | "/actividad"
    | "/informes";
  label: string;
  short: string;
  icon: LucideIcon;
  group: "Operativa" | "Administración";
};

export const destinations: Destination[] = [
  {
    area: "inicio",
    to: "/",
    label: "Inicio",
    short: "Inicio",
    icon: House,
    group: "Operativa",
  },
  {
    area: "presupuestos",
    to: "/presupuestos",
    label: "Presupuestos",
    short: "Presup.",
    icon: Calculator,
    group: "Operativa",
  },
  {
    area: "obras",
    to: "/obras",
    label: "Obras",
    short: "Obras",
    icon: TreePine,
    group: "Operativa",
  },
  {
    area: "planificacion",
    to: "/planificacion",
    label: "Planificación",
    short: "Plan",
    icon: CalendarRange,
    group: "Operativa",
  },
  {
    area: "parte",
    to: "/parte",
    label: "Parte diario",
    short: "Parte",
    icon: ClipboardCheck,
    group: "Operativa",
  },
  {
    area: "gastos",
    to: "/gastos",
    label: "Gastos",
    short: "Gastos",
    icon: WalletCards,
    group: "Operativa",
  },
  {
    area: "ausencias",
    to: "/ausencias",
    label: "Vacaciones y ausencias",
    short: "Ausencias",
    icon: Sun,
    group: "Operativa",
  },
  {
    area: "avisos",
    to: "/avisos",
    label: "Avisos",
    short: "Avisos",
    icon: Bell,
    group: "Operativa",
  },
  {
    area: "facturas",
    to: "/facturas",
    label: "Facturas",
    short: "Facturas",
    icon: Receipt,
    group: "Administración",
  },
  {
    area: "contabilidad",
    to: "/contabilidad",
    label: "Contabilidad",
    short: "Conta",
    icon: Landmark,
    group: "Administración",
  },
  {
    area: "catalogo",
    to: "/catalogo",
    label: "Catálogo",
    short: "Catálogo",
    icon: Sprout,
    group: "Administración",
  },
  {
    area: "cuadrillas",
    to: "/cuadrillas",
    label: "Cuadrillas",
    short: "Equipos",
    icon: UsersRound,
    group: "Administración",
  },
  {
    area: "actividad",
    to: "/actividad",
    label: "Actividad",
    short: "Actividad",
    icon: History,
    group: "Administración",
  },
  {
    area: "informes",
    to: "/informes",
    label: "Informes",
    short: "Informes",
    icon: ChartColumn,
    group: "Administración",
  },
];

/** Small counters next to each destination, scoped to what the user can act on. */
export function navigationCounts(
  workspace: Workspace,
  user: Person,
): Partial<Record<Area, number>> {
  const avisos = workspace.notifications.filter(
    (item) => item.personId === user.id && !item.read,
  ).length;
  if (user.role === "admin") {
    return {
      presupuestos: workspace.budgets.filter(
        (b) => b.status === "borrador" || b.status === "enviado",
      ).length,
      obras: workspace.works.filter((w) => w.status !== "facturada").length,
      ausencias: workspace.absences.filter((a) => a.status === "solicitada").length,
      gastos: workspace.expenses.filter((e) => e.status === "pendiente").length,
      facturas: workspace.invoices.filter((i) => i.status === "borrador").length,
      avisos,
    };
  }
  const own = workspace.absences.filter((a) => a.personId === user.id && a.status === "solicitada");
  const mine = workspace.works.filter(
    (work) =>
      workspace.assignments.some(
        (assignment) => assignment.workId === work.id && assignment.crewId === user.crewId,
      ) &&
      (work.status === "en_curso" || work.status === "planificada"),
  );
  const rejected = workspace.expenses.filter(
    (e) => e.createdBy === user.id && e.status === "rechazado",
  ).length;
  return {
    obras: mine.length,
    ausencias: own.length,
    gastos: rejected,
    avisos,
  };
}

export function isActive(to: string, pathname: string) {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

/** On a detail page (e.g. /obras/123) the section it belongs to, so mobile can offer "back". */
export function parentDestination(pathname: string) {
  return destinations.find(
    (item) =>
      item.to !== "/" && pathname.startsWith(`${item.to}/`) && pathname.length > item.to.length + 1,
  );
}

export function pageTitle(pathname: string) {
  const match = [...destinations]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => (item.to === "/" ? pathname === "/" : pathname.startsWith(item.to)));
  return match?.label ?? "Gestión forestal";
}
