import { z } from 'zod'

import { customerStatuses, type CustomerStatusFilter } from './customer'

export const customerScenarios = ['default', 'loading', 'empty', 'error', 'long'] as const

export type CustomerSearch = {
  q: string
  status: CustomerStatusFilter
  scenario: (typeof customerScenarios)[number]
}

export const defaultCustomerSearch: CustomerSearch = { q: '', status: 'all', scenario: 'default' }

const customerSearchSchema = z.object({
  q: z.string().catch(defaultCustomerSearch.q),
  status: z.union([z.literal('all'), z.enum(customerStatuses)]).catch(defaultCustomerSearch.status),
  scenario: z.enum(customerScenarios).catch(defaultCustomerSearch.scenario),
})

/** Keeps URL state safe even when users paste malformed query parameters. */
export function parseCustomerSearch(input: Record<string, unknown>): CustomerSearch {
  const search = customerSearchSchema.parse(input)

  // Preserve trailing spaces while typing multi-word searches. The adapter trims for matching.
  return { q: search.q, status: search.status, scenario: search.scenario }
}
