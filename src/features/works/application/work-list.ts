import {
  calculatePerformance,
  type Person,
  type Work,
  type WorkPerformance,
  type Workspace,
  type WorkStatus,
} from '@/features/workspace'

export type WorkFilter = 'activas' | WorkStatus | 'todas'

export type WorkRow = {
  work: Work
  performance: WorkPerformance
  crewIds: string[]
}

export function visibleWorks(workspace: Workspace, user: Person): Work[] {
  if (user.role === 'admin') return workspace.works
  return workspace.works.filter((work) =>
    workspace.assignments.some(
      (assignment) => assignment.workId === work.id && assignment.crewId === user.crewId,
    ),
  )
}

export function workRows(workspace: Workspace, user: Person): WorkRow[] {
  return visibleWorks(workspace, user).map((work) => ({
    work,
    performance: calculatePerformance(work, workspace.reports, workspace.people),
    crewIds: [
      ...new Set(
        workspace.assignments.filter((item) => item.workId === work.id).map((item) => item.crewId),
      ),
    ],
  }))
}

const order: WorkStatus[] = ['en_curso', 'planificada', 'pendiente', 'terminada', 'facturada']

export function filterRows(
  rows: WorkRow[],
  filter: WorkFilter,
  query: string,
  year: number | 'todos',
) {
  const text = query.trim().toLocaleLowerCase('es')
  return rows
    .filter(({ work }) => {
      if (year !== 'todos' && work.year !== year) return false
      if (filter === 'activas' && (work.status === 'facturada' || work.status === 'terminada'))
        return false
      if (filter !== 'activas' && filter !== 'todas' && work.status !== filter) return false
      return !text || `${work.code} ${work.title}`.toLocaleLowerCase('es').includes(text)
    })
    .sort(
      (a, b) =>
        order.indexOf(a.work.status) - order.indexOf(b.work.status) ||
        b.work.code.localeCompare(a.work.code),
    )
}
