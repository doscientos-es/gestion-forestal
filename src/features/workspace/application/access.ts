import type { Role } from './model'

export type Area =
  | 'inicio'
  | 'presupuestos'
  | 'obras'
  | 'planificacion'
  | 'parte'
  | 'ausencias'
  | 'gastos'
  | 'facturas'
  | 'contabilidad'
  | 'catalogo'
  | 'actividad'
  | 'cuadrillas'
  | 'avisos'
  | 'clientes'

const access: Record<Role, Area[]> = {
  admin: [
    'inicio',
    'presupuestos',
    'obras',
    'planificacion',
    'ausencias',
    'gastos',
    'avisos',
    'facturas',
    'contabilidad',
    'catalogo',
    'cuadrillas',
    'clientes',
    'actividad',
  ],
  capataz: ['inicio', 'obras', 'parte', 'gastos', 'ausencias', 'avisos'],
  peon: ['inicio', 'obras', 'ausencias', 'avisos'],
}

/** UI-level access map. Production enforces the same rules with RLS policies. */
export function canAccess(role: Role, area: Area) {
  return access[role].includes(area)
}

export const roleLabels: Record<Role, string> = {
  admin: 'Administración',
  capataz: 'Capataz',
  peon: 'Peón forestal',
}
