import type { Budget, BudgetLine, BudgetParams, Cents, PlannedFigures, Species } from './model'

export type LineEstimate = {
  lineId: string
  plants: number
  hectares: number
  workerDays: number
  materialCost: Cents
  otherCost: Cents
  fixedPrice: Cents
}

export type BudgetEstimate = PlannedFigures & {
  lines: LineEstimate[]
  otherCost: Cents
  fixedPrice: Cents
  margin: Cents
  marginRate: number
  pricePerHectare: Cents
}

const PRICE_ROUNDING: Cents = 1_000

function speciesCost(speciesId: string, species: Species[]) {
  return species.find((item) => item.id === speciesId)?.unitCost ?? 0
}

export function estimateLine(line: BudgetLine, species: Species[]): LineEstimate {
  if (line.kind === 'libre') {
    return {
      lineId: line.id,
      plants: 0,
      hectares: 0,
      workerDays: 0,
      materialCost: 0,
      otherCost: Math.round(line.quantity * line.unitCost),
      fixedPrice: Math.round(line.quantity * line.unitPrice),
    }
  }
  if (line.kind === 'plantacion') {
    const plants = Math.round(line.hectares * line.density)
    return {
      lineId: line.id,
      plants,
      hectares: line.hectares,
      workerDays: line.yieldPerDay > 0 ? plants / line.yieldPerDay : 0,
      materialCost: plants * speciesCost(line.speciesId, species),
      otherCost: 0,
      fixedPrice: 0,
    }
  }
  return {
    lineId: line.id,
    plants: 0,
    hectares: line.hectares,
    workerDays: line.hectaresPerDay > 0 ? line.hectares / line.hectaresPerDay : 0,
    materialCost: 0,
    otherCost: 0,
    fixedPrice: 0,
  }
}

/**
 * Budget model used by the forestry company: plants ÷ yield gives worker days,
 * crews always work complete days, and price applies the target margin over forestry cost.
 * Free-form lines add their explicit sale price and internal cost without extra crew days.
 */
export function estimateBudget(
  lines: BudgetLine[],
  params: BudgetParams,
  species: Species[],
): BudgetEstimate {
  const estimates = lines.map((line) => estimateLine(line, species))
  const plants = estimates.reduce((sum, item) => sum + item.plants, 0)
  const hectares = estimates.reduce((sum, item) => sum + item.hectares, 0)
  const rawWorkerDays = estimates.reduce((sum, item) => sum + item.workerDays, 0)
  const crewSize = Math.max(1, Math.round(params.crewSize))
  const crewDays = rawWorkerDays > 0 ? Math.ceil(rawWorkerDays / crewSize) : 0
  const workerDays = crewDays * crewSize
  const laborCost = workerDays * params.dailyCost
  const materialCost = estimates.reduce((sum, item) => sum + item.materialCost, 0)
  const travelCost = crewDays * params.travelPerCrewDay
  const otherCost = estimates.reduce((sum, item) => sum + item.otherCost, 0)
  const fixedPrice = estimates.reduce((sum, item) => sum + item.fixedPrice, 0)
  const operationalCost = laborCost + materialCost + travelCost
  const totalCost = operationalCost + otherCost
  const margin = Math.min(Math.max(params.targetMargin, 0), 0.6)
  const price =
    fixedPrice +
    (operationalCost > 0
      ? Math.ceil(operationalCost / (1 - margin) / PRICE_ROUNDING) * PRICE_ROUNDING
      : 0)

  return {
    lines: estimates,
    plants,
    hectares,
    workerDays,
    crewDays,
    crewSize,
    laborCost,
    materialCost,
    travelCost,
    otherCost,
    fixedPrice,
    totalCost,
    price,
    dailyCost: params.dailyCost,
    travelPerCrewDay: params.travelPerCrewDay,
    unitMaterialCost: plants > 0 ? Math.round(materialCost / plants) : 0,
    margin: price - totalCost,
    marginRate: price > 0 ? (price - totalCost) / price : 0,
    pricePerHectare: hectares > 0 ? Math.round(price / hectares) : 0,
  }
}

export function estimateStoredBudget(budget: Budget, species: Species[]) {
  return estimateBudget(budget.lines, budget.params, species)
}

export function toPlannedFigures(estimate: BudgetEstimate): PlannedFigures {
  return {
    plants: estimate.plants,
    hectares: estimate.hectares,
    workerDays: estimate.workerDays,
    crewDays: estimate.crewDays,
    crewSize: estimate.crewSize,
    laborCost: estimate.laborCost,
    materialCost: estimate.materialCost,
    travelCost: estimate.travelCost,
    otherCost: estimate.otherCost,
    totalCost: estimate.totalCost,
    price: estimate.price,
    dailyCost: estimate.dailyCost,
    travelPerCrewDay: estimate.travelPerCrewDay,
    unitMaterialCost: estimate.unitMaterialCost,
  }
}

export type BudgetIssue = { field: string; message: string }

export function validateBudget(
  draft: Pick<Budget, 'title' | 'clientId' | 'zoneId' | 'lines' | 'params'>,
): BudgetIssue[] {
  const issues: BudgetIssue[] = []
  if (!draft.title.trim())
    issues.push({ field: 'title', message: 'Indica un nombre para la obra.' })
  if (!draft.clientId) issues.push({ field: 'clientId', message: 'Selecciona el cliente.' })
  if (!draft.zoneId) issues.push({ field: 'zoneId', message: 'Selecciona la zona.' })
  if (draft.lines.length === 0)
    issues.push({ field: 'lines', message: 'Añade al menos una partida.' })
  draft.lines.forEach((line, index) => {
    if (line.kind === 'libre') {
      if (!line.description.trim() || !line.unit.trim())
        issues.push({
          field: `lines.${index}`,
          message: `Partida ${index + 1}: indica concepto y unidad.`,
        })
      if (!Number.isFinite(line.quantity) || line.quantity <= 0)
        issues.push({ field: `lines.${index}`, message: `Partida ${index + 1}: cantidad > 0.` })
      if (
        ![line.unitPrice, line.unitCost].every(
          (value) => Number.isSafeInteger(value) && value >= 0,
        ) ||
        ![line.unitPrice, line.unitCost].every((value) =>
          Number.isSafeInteger(Math.round(value * line.quantity)),
        )
      )
        issues.push({
          field: `lines.${index}`,
          message: `Partida ${index + 1}: precio y coste deben ser importes válidos, no negativos.`,
        })
      return
    }
    if (!Number.isFinite(line.hectares) || line.hectares <= 0)
      issues.push({ field: `lines.${index}`, message: `Partida ${index + 1}: superficie > 0 ha.` })
    if (
      line.kind === 'plantacion' &&
      ![line.density, line.yieldPerDay].every((value) => Number.isFinite(value) && value > 0)
    )
      issues.push({
        field: `lines.${index}`,
        message: `Partida ${index + 1}: densidad y rendimiento deben ser > 0.`,
      })
    if (
      line.kind === 'tratamiento' &&
      (!line.description.trim() ||
        !Number.isFinite(line.hectaresPerDay) ||
        line.hectaresPerDay <= 0)
    )
      issues.push({
        field: `lines.${index}`,
        message: `Partida ${index + 1}: describe el tratamiento e indica un rendimiento > 0.`,
      })
  })
  if (
    draft.lines.some((line) => line.kind !== 'libre') &&
    (!Number.isFinite(draft.params.dailyCost) || draft.params.dailyCost <= 0)
  )
    issues.push({ field: 'dailyCost', message: 'El coste de peonada debe ser > 0.' })
  return issues
}
