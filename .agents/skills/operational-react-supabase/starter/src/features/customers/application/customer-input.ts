import { z } from 'zod'

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre del cliente.').max(120),
  contactName: z.string().trim().min(1, 'Escribe el nombre del contacto.').max(120),
  email: z.string().trim().email('Introduce un email válido.').max(254),
})

export type CustomerInput = z.infer<typeof customerInputSchema>
