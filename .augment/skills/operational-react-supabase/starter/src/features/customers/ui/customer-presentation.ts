import type { CustomerStatus } from '../application/customer'

export const customerStatusLabels: Record<CustomerStatus, string> = {
  active: 'Activo',
  trial: 'En prueba',
}

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function customerInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toLocaleUpperCase('es')
}
