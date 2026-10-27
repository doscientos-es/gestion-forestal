import { CommandError, type Context } from './commands'
import type { Cents, Species, SpeciesKind, Workspace } from './model'

export type SpeciesInput = { name: string; kind: SpeciesKind; unitCost: Cents }

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

function validate(workspace: Workspace, input: SpeciesInput, speciesId?: string) {
  if (!input.name.trim()) throw new CommandError('Escribe el nombre de la especie.')
  if (workspace.species.some((item) => item.id !== speciesId && sameText(item.name, input.name)))
    throw new CommandError('Ya existe una especie con ese nombre.')
  if (!Number.isInteger(input.unitCost) || input.unitCost <= 0)
    throw new CommandError('El coste por planta debe ser mayor que 0.')
}

/**
 * Adds a species or edits one (name, kind and cost per plant). Works already accepted keep the
 * cost they were budgeted with; drafts and sent budgets are re-estimated with the new price.
 */
export function saveSpecies(
  workspace: Workspace,
  input: SpeciesInput,
  context: Context,
  speciesId?: string,
): { workspace: Workspace; species: Species } {
  validate(workspace, input, speciesId)
  const values = { name: input.name.trim(), kind: input.kind, unitCost: input.unitCost }
  if (!speciesId) {
    const species: Species = { id: context.id(), ...values }
    return { workspace: { ...workspace, species: [...workspace.species, species] }, species }
  }
  const current = workspace.species.find((item) => item.id === speciesId)
  if (!current) throw new CommandError('Especie no encontrada.')
  const species: Species = { ...current, ...values }
  return {
    workspace: {
      ...workspace,
      species: workspace.species.map((item) => (item.id === speciesId ? species : item)),
    },
    species,
  }
}
