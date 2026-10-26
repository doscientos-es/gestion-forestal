import { createFileRoute } from '@tanstack/react-router'

import { StarterGuide } from '@/app/starter-guide'

export const Route = createFileRoute('/guia')({ component: StarterGuide })
