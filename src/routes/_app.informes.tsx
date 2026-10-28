import { createFileRoute, redirect } from '@tanstack/react-router'

import { requireArea } from '@/app/route-guards'

/** Reports now live inside Contabilidad; old links and bookmarks land on the campaigns tab. */
export const Route = createFileRoute('/_app/informes')({
  beforeLoad: async ({ context }) => {
    await requireArea(context, 'contabilidad')
    throw redirect({ to: '/contabilidad', search: { vista: 'campanas' } as never })
  },
})
