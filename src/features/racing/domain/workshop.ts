import type { Invoice, Part, Product, Project, Purchase, QuoteLine, Workshop } from './model'

const positive = (value: number) => Number.isFinite(value) && value > 0
const nonnegative = (value: number) => Number.isFinite(value) && value >= 0
const required = (value: string) => value.trim().length > 0

export function quoteTotal(lines: QuoteLine[]) {
  return lines.reduce((sum, line) => sum + Math.round(line.quantity * line.price), 0)
}

export function projectCosts(parts: Part[], projectId: string) {
  return parts.filter((part) => part.projectId === projectId).reduce(
    (totals, part) => ({
      hours: totals.hours + part.hours,
      labor: totals.labor + Math.round(part.hours * part.hourlyCost),
      materials: totals.materials + part.materialCost,
      expenses: totals.expenses + part.expense,
    }),
    { hours: 0, labor: 0, materials: 0, expenses: 0 },
  )
}

export function addProject(state: Workshop, project: Project): Workshop {
  if (![project.client, project.vehicle, project.plate, project.title].every(required)) throw new Error('Completa el cliente, vehículo, matrícula o referencia y trabajo.')
  return { ...state, projects: [project, ...state.projects] }
}

export function addQuoteLine(state: Workshop, projectId: string, line: QuoteLine): Workshop {
  const project = state.projects.find((item) => item.id === projectId)
  if (!project || project.status !== 'presupuesto') throw new Error('Solo se puede editar un presupuesto pendiente.')
  if (!required(line.description) || !positive(line.quantity) || !nonnegative(line.price)) throw new Error('Revisa el concepto, la cantidad y el precio.')
  return { ...state, projects: state.projects.map((item) => item.id === projectId ? { ...item, lines: [...item.lines, line] } : item) }
}

export function approveProject(state: Workshop, projectId: string): Workshop {
  const project = state.projects.find((item) => item.id === projectId)
  if (!project || project.status !== 'presupuesto' || !project.lines.length) throw new Error('Añade partidas antes de aprobar el presupuesto.')
  return { ...state, projects: state.projects.map((item) => item.id === projectId ? { ...item, status: 'en taller' } : item) }
}

export function finishProject(state: Workshop, projectId: string): Workshop {
  const project = state.projects.find((item) => item.id === projectId)
  if (!project || project.status !== 'en taller') throw new Error('El proyecto debe estar en taller.')
  return { ...state, projects: state.projects.map((item) => item.id === projectId ? { ...item, status: 'terminado' } : item) }
}

export function addPart(state: Workshop, input: Omit<Part, 'materialCost'>): Workshop {
  const project = state.projects.find((item) => item.id === input.projectId)
  const product = input.productId ? state.products.find((item) => item.id === input.productId) : null
  if (!project || project.status !== 'en taller') throw new Error('Selecciona un proyecto en taller.')
  if (!required(input.worker) || !required(input.description) || !positive(input.hours) || !nonnegative(input.hourlyCost) || !nonnegative(input.expense)) throw new Error('Revisa el operario, intervención, horas y costes.')
  if (input.productId && (!product || !positive(input.quantity) || input.quantity > product.stock)) throw new Error('Revisa la pieza y la cantidad disponible en stock.')
  if (!input.productId && input.quantity !== 0) throw new Error('Selecciona una pieza para registrar su consumo.')
  const part: Part = { ...input, materialCost: product ? Math.round(product.cost * input.quantity) : 0 }
  return { ...state, parts: [part, ...state.parts], products: state.products.map((item) => item.id === product?.id ? { ...item, stock: item.stock - input.quantity } : item) }
}

export function addProduct(state: Workshop, product: Product): Workshop {
  if (![product.name, product.sku, product.supplier, product.location].every(required) || !nonnegative(product.stock) || !nonnegative(product.minimum) || !nonnegative(product.cost)) throw new Error('Completa los datos de la pieza y revisa los importes.')
  if (state.products.some((item) => item.sku.toLowerCase() === product.sku.trim().toLowerCase())) throw new Error('Ya existe una pieza con esa referencia.')
  return { ...state, products: [...state.products, product] }
}

export function addPurchase(state: Workshop, purchase: Purchase): Workshop {
  if (!state.products.some((item) => item.id === purchase.productId) || !positive(purchase.quantity) || (purchase.projectId && !state.projects.some((item) => item.id === purchase.projectId))) throw new Error('Selecciona una pieza y una cantidad válida.')
  return { ...state, purchases: [purchase, ...state.purchases] }
}

export function receivePurchase(state: Workshop, id: string, received: number, confirmedDifference: boolean): Workshop {
  const purchase = state.purchases.find((item) => item.id === id)
  if (!purchase || purchase.status !== 'pendiente') throw new Error('El pedido ya se ha recibido o no existe.')
  if (!nonnegative(received)) throw new Error('Indica una cantidad recibida válida.')
  if (received !== purchase.quantity && !confirmedDifference) throw new Error('La cantidad difiere del pedido. Confirma la diferencia antes de actualizar el stock.')
  return { ...state, purchases: state.purchases.map((item) => item.id === id ? { ...item, received, status: 'recibido' } : item), products: state.products.map((item) => item.id === purchase.productId ? { ...item, stock: item.stock + received } : item) }
}

export function createInvoice(state: Workshop, invoice: Invoice): Workshop {
  const project = state.projects.find((item) => item.id === invoice.projectId)
  if (!project || project.status === 'presupuesto' || !project.lines.length) throw new Error('Aprueba primero el presupuesto.')
  if (state.invoices.some((item) => item.projectId === invoice.projectId)) throw new Error('Ya hay un borrador para este proyecto.')
  return { ...state, invoices: [{ ...invoice, lines: project.lines.map((line) => ({ ...line })) }, ...state.invoices] }
}