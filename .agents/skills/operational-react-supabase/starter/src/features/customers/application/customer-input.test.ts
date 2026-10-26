import { describe, expect, it } from 'vitest'

import { customerInputSchema } from './customer-input'

describe('customer input', () => {
  const valid = { name: 'Estudio Demo', contactName: 'Alex Demo', email: 'alex@example.test' }

  it('trims values before creating a record', () => {
    expect(customerInputSchema.parse({ ...valid, name: ' Estudio Demo ' })).toEqual(valid)
  })

  it.each([
    { ...valid, name: '   ' },
    { ...valid, contactName: '' },
    { ...valid, email: 'not-an-email' },
    { ...valid, name: 'a'.repeat(121) },
  ])('rejects invalid input: %j', (input) => {
    expect(customerInputSchema.safeParse(input).success).toBe(false)
  })
})
