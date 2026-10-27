import { createFileRoute } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'
import { CatalogPage } from '@/features/catalog'

export const Route = createFileRoute('/_app/catalogo')({
  beforeLoad: ({ context }) => requireArea(context, 'catalogo'),
  component: CatalogPage,
})
