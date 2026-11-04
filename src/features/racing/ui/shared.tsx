import type { ReactNode } from 'react'

import type { Project, Workshop } from '../domain/model'

export type Change = (command: (state: Workshop) => Workshop) => boolean
export const uid = () => crypto.randomUUID()
export const today = () => new Date().toISOString().slice(0, 10)
export const money = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
export const eurosToCents = (value: string) => Math.round(Number(value) * 100)
export function formText(data: FormData, name: string): string {
  const value = data.get(name)
  return typeof value === 'string' ? value : ''
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="rr-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rr-card">
      <div className="rr-card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'green' | 'amber' | 'red'
}) {
  return <span className={`rr-badge rr-badge-${tone}`}>{children}</span>
}

export function Status({ status }: { status: Project['status'] }) {
  return (
    <Badge tone={status === 'en taller' ? 'green' : status === 'presupuesto' ? 'amber' : 'neutral'}>
      {status}
    </Badge>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rr-empty">{children}</p>
}

export function projectLabel(project: Project) {
  return `${project.reference} · ${project.vehicle} · ${project.title}`
}

export function ProjectSelect({
  projects,
  value,
  onChange,
  placeholder = 'Selecciona un proyecto',
}: {
  projects: Project[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {projectLabel(project)}
        </option>
      ))}
    </select>
  )
}

export function downloadCsv(name: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map(
          (value) =>
            `"${(/^[\s]*[=+@-]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`,
        )
        .join(';'),
    )
    .join('\r\n')
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
