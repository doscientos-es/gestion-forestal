import type { Customer } from '../application/customer'
import { customerInputSchema, type CustomerInput } from '../application/customer-input'
import type { CustomerSearch } from '../application/customer-search'
import { customers, longCustomer } from './customer-fixtures'

/**
 * Session-only demo repository. Never uses storage, network or production data.
 * Replace the adapters only after approving the data model, tenant scope and RLS.
 */
export function createDemoCustomerRepository() {
  const records = customers.map((customer) => ({ ...customer }))

  return {
    async list(this: void, search: CustomerSearch): Promise<Customer[]> {
      if (search.scenario === 'error') throw new Error('Synthetic customer error')
      if (search.scenario === 'empty') return []
      const query = search.q.trim().toLocaleLowerCase('es')
      const source = search.scenario === 'long' ? [longCustomer, ...records] : records

      return source.filter((customer) => {
        const matchesStatus = search.status === 'all' || customer.status === search.status
        const searchableText = `${customer.name} ${customer.contactName} ${customer.email}`
        return matchesStatus && (!query || searchableText.toLocaleLowerCase('es').includes(query))
      })
    },
    async create(this: void, input: CustomerInput): Promise<Customer> {
      const customer: Customer = {
        ...customerInputSchema.parse(input),
        id: `customer-${crypto.randomUUID()}`,
        status: 'trial',
        monthlyValue: 0,
      }
      records.unshift(customer)
      return customer
    },
  }
}

const repository = createDemoCustomerRepository()
export const listCustomers = repository.list
export const createCustomer = repository.create
