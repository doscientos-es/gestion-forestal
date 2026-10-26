import { describe, expect, it } from 'vitest'

import { defaultCustomerSearch, parseCustomerSearch } from './customer-search'

describe('parseCustomerSearch', () => {
  it('validates URL filters without removing spaces while typing', () => {
    expect(parseCustomerSearch({ q: '  Alba  ', status: 'active' })).toEqual({
      q: '  Alba  ',
      status: 'active',
      scenario: 'default',
    })
  })

  it('preserves the space needed to enter a multi-word search', () => {
    expect(parseCustomerSearch({ q: 'Alba ' }).q).toBe('Alba ')
    expect(parseCustomerSearch({ q: 'Alba Gestión' }).q).toBe('Alba Gestión')
  })

  it('uses safe defaults for malformed URL values', () => {
    expect(parseCustomerSearch({ q: ['not-a-string'], status: 'unknown' })).toEqual(
      defaultCustomerSearch,
    )
  })

  it('allows only the documented synthetic scenarios', () => {
    expect(parseCustomerSearch({ scenario: 'long' }).scenario).toBe('long')
    expect(parseCustomerSearch({ scenario: 'production' }).scenario).toBe('default')
    expect(parseCustomerSearch({ scenario: ['error'] }).scenario).toBe('default')
  })
})
