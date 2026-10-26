import { describe, expect, it } from 'vitest'

import { defaultCustomerSearch } from '../application/customer-search'
import { createDemoCustomerRepository } from './list-customers'

describe('synthetic customer repository', () => {
  it('filters by status and by contact or email, case-insensitively', async () => {
    const repository = createDemoCustomerRepository()
    const results = await repository.list({
      ...defaultCustomerSearch,
      q: 'ALBA@EXAMPLE.TEST',
      status: 'active',
    })
    expect(results.map((customer) => customer.id)).toEqual(['customer-alba'])
    expect(await repository.list({ ...defaultCustomerSearch, q: 'ALBA', status: 'trial' })).toEqual(
      [],
    )
  })

  it('creates only temporary trial records, without changing the fixtures', async () => {
    const repository = createDemoCustomerRepository()
    const before = await repository.list(defaultCustomerSearch)
    const created = await repository.create({
      name: ' Demo temporal ',
      contactName: 'Alex Demo',
      email: 'alex@example.test',
    })
    expect(created).toMatchObject({ name: 'Demo temporal', status: 'trial', monthlyValue: 0 })
    expect(await repository.list(defaultCustomerSearch)).toHaveLength(before.length + 1)
    expect(await createDemoCustomerRepository().list(defaultCustomerSearch)).toHaveLength(
      before.length,
    )
  })

  it('rejects invalid records without modifying the list', async () => {
    const repository = createDemoCustomerRepository()
    const before = await repository.list(defaultCustomerSearch)
    await expect(
      repository.create({ name: '', contactName: '', email: 'invalid' }),
    ).rejects.toThrow()
    expect(await repository.list(defaultCustomerSearch)).toHaveLength(before.length)
  })

  it('supports recoverable empty, error and long-content previews', async () => {
    const repository = createDemoCustomerRepository()
    expect(await repository.list({ ...defaultCustomerSearch, scenario: 'empty' })).toEqual([])
    await expect(repository.list({ ...defaultCustomerSearch, scenario: 'error' })).rejects.toThrow(
      'Synthetic customer error',
    )
    const long = await repository.list({ ...defaultCustomerSearch, scenario: 'long' })
    expect(long[0]?.name.length).toBeGreaterThan(70)
    expect(await repository.list(defaultCustomerSearch)).not.toEqual([])
  })
})
