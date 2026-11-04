export type ProjectStatus = 'presupuesto' | 'en taller' | 'terminado'
export type LineKind = 'pieza' | 'mano de obra'

export interface QuoteLine {
  id: string
  description: string
  kind: LineKind
  supplier: string
  quantity: number
  price: number
}

export interface Project {
  id: string
  reference: string
  client: string
  vehicle: string
  plate: string
  title: string
  status: ProjectStatus
  lines: QuoteLine[]
  responsible?: string
}

export interface Part {
  id: string
  projectId: string
  date: string
  worker: string
  description: string
  hours: number
  hourlyCost: number
  productId: string | null
  quantity: number
  materialCost: number
  expense: number
}

export interface Product {
  id: string
  sku: string
  name: string
  supplier: string
  location: string
  stock: number
  minimum: number
  cost: number
}

export interface Purchase {
  id: string
  reference: string
  projectId: string | null
  productId: string
  quantity: number
  received: number | null
  status: 'pendiente' | 'recibido'
}

export interface Invoice {
  id: string
  projectId: string
  date: string
  lines: QuoteLine[]
  paid: boolean
}

export interface Absence {
  id: string
  worker: string
  from: string
  to: string
}

export interface Task {
  id: string
  projectId: string
  description: string
  worker: string
  done: boolean
}

export interface Workshop {
  version: 1
  projects: Project[]
  parts: Part[]
  products: Product[]
  purchases: Purchase[]
  invoices: Invoice[]
  absences: Absence[]
  tasks: Task[]
}
