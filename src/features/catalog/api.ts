import {
  apiDeps,
  mutate,
  saveSpecies,
  type ApiDeps,
  type Species,
  type SpeciesInput,
} from '@/features/workspace'

export type CatalogApi = {
  /** Creates a species, or edits the one given (name, kind and cost per plant). */
  saveSpecies(input: SpeciesInput, speciesId?: string): Promise<Species>
}

export function createCatalogApi(deps: ApiDeps): CatalogApi {
  return {
    saveSpecies: (input, speciesId) =>
      mutate(deps, (workspace, context) => {
        const { workspace: next, species } = saveSpecies(workspace, input, context, speciesId)
        return { workspace: next, result: species }
      }),
  }
}

export const catalogApi = createCatalogApi(apiDeps)
