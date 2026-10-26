import type { Customer } from './customer'

/** All numbers describe the current result, never an invented trend or comparison. */
export function summarizeCustomers(customers: Customer[]) {
  return {
    total: customers.length,
    active: customers.filter((customer) => customer.status === 'active').length,
    monthlyValue: customers.reduce((total, customer) => total + customer.monthlyValue, 0),
  }
}
