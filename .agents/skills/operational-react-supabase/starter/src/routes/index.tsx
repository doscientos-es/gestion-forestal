import { createFileRoute } from '@tanstack/react-router'

import { CustomerListPage, parseCustomerSearch, type CustomerSearch } from '@/features/customers'

export const Route = createFileRoute('/')({
  validateSearch: parseCustomerSearch,
  component: CustomerRoute,
})

function CustomerRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  function onSearchChange(update: Partial<CustomerSearch>) {
    void navigate({ search: (previous) => ({ ...previous, ...update }) })
  }

  return <CustomerListPage search={search} onSearchChange={onSearchChange} />
}
