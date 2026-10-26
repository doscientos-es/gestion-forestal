import { describe, expect, it } from 'vitest'

import type { Customer } from './customer'
import { summarizeCustomers } from './summarize-customers'

describe('summarizeCustomers', () => {
  const customer: Customer = {
    id: 'demo',
    name: 'Demo',
    contactName: 'Alex Demo',
    email: 'alex@example.test',
    status: 'active',
    monthlyValue: 490,
  }
  it('summarizes only the supplied result', () => {
    expect(
      summarizeCustomers([
        customer,
        { ...customer, id: 'trial', status: 'trial', monthlyValue: 0 },
      ]),
    ).toEqual({ total: 2, active: 1, monthlyValue: 490 })
  })
  it('handles an empty result without an invented comparison', () => {
    expect(summarizeCustomers([])).toEqual({ total: 0, active: 0, monthlyValue: 0 })
  })
})
