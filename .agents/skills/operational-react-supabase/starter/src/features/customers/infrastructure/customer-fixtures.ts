import type { Customer } from '../application/customer'

/** Synthetic data only. Do not replace this with production exports or credentials. */
export const customers: Customer[] = [
  {
    id: 'customer-alba',
    name: 'Alba Gestión',
    contactName: 'Alba Ruiz',
    email: 'alba@example.test',
    status: 'active',
    monthlyValue: 490,
  },
  {
    id: 'customer-norte',
    name: 'Norte Logística',
    contactName: 'Martín Vidal',
    email: 'martin@example.test',
    status: 'trial',
    monthlyValue: 0,
  },
  {
    id: 'customer-brisa',
    name: 'Brisa Estudio',
    contactName: 'Clara Soler',
    email: 'clara@example.test',
    status: 'active',
    monthlyValue: 290,
  },
  {
    id: 'customer-cauce',
    name: 'Cauce Taller',
    contactName: 'Leo Roca',
    email: 'leo@example.test',
    status: 'active',
    monthlyValue: 180,
  },
  {
    id: 'customer-oliva',
    name: 'Oliva Proyectos',
    contactName: 'Nora Costa',
    email: 'nora@example.test',
    status: 'trial',
    monthlyValue: 0,
  },
  {
    id: 'customer-vela',
    name: 'Vela Cooperativa',
    contactName: 'Dani Serra',
    email: 'dani@example.test',
    status: 'active',
    monthlyValue: 350,
  },
]

export const longCustomer: Customer = {
  id: 'customer-long',
  name: 'Cooperativa de servicios compartidos y proyectos de transformación del Mediterráneo',
  contactName: 'María del Mar Fernández de la Fuente',
  email: 'coordinacion-de-proyectos-y-operaciones@example.test',
  status: 'active',
  monthlyValue: 1250,
}
