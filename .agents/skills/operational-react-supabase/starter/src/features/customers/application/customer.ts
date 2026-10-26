export const customerStatuses = ['active', 'trial'] as const

export type CustomerStatus = (typeof customerStatuses)[number]
export type CustomerStatusFilter = CustomerStatus | 'all'

export type Customer = {
  id: string
  name: string
  contactName: string
  email: string
  status: CustomerStatus
  monthlyValue: number
}
