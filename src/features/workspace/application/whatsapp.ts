import { formatShortDate } from '@/shared/lib/format'

import type { Assignment, Person, Work } from './model'

const DEFAULT_COUNTRY = '34'

/** Digits only, with the country code (Spanish numbers get 34). Null when it cannot be dialled. */
export function dialNumber(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 9) return `${DEFAULT_COUNTRY}${digits}`
  return digits.length >= 10 ? digits : null
}

/** `wa.me` opens a chat with the message ready to send. Group chats are not supported by WhatsApp. */
export function whatsappLink(phone: string, text: string) {
  const number = dialNumber(phone)
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null
}

export function callLink(phone: string) {
  const number = dialNumber(phone)
  return number ? `tel:+${number}` : null
}

export type MessageTemplate = { id: string; label: string }

export const messageTemplates: MessageTemplate[] = [
  { id: 'convocatoria', label: 'Convocatoria' },
  { id: 'cambio', label: 'Cambio de fechas' },
  { id: 'parte', label: 'Recordatorio del parte' },
  { id: 'material', label: 'Material y herramienta' },
]

/** Starting text for each template; the office edits it before opening WhatsApp. */
export function messageFor(
  templateId: string,
  work: Pick<Work, 'title'>,
  assignment: Pick<Assignment, 'start' | 'end'> | undefined,
  sender: Pick<Person, 'name'> | null,
) {
  const dates = assignment
    ? `del ${formatShortDate(assignment.start)} al ${formatShortDate(assignment.end)}`
    : 'en las próximas fechas'
  const sign = `— ${sender?.name ?? 'Administración'}`
  const body: Record<string, string> = {
    convocatoria: `Hola, equipo. Empezamos «${work.title}» ${dates}. Confirmad que podéis venir.`,
    cambio: `Hola, equipo. Cambio en «${work.title}»: ahora va ${dates}. Avisad si hay algún problema.`,
    parte: `Hola. Recordad enviar el parte de hoy de «${work.title}» antes de salir del monte.`,
    material: `Hola. Para «${work.title}» llevad protectores, tutores y herramienta de ahoyado. Avisad si falta algo.`,
  }
  return `${body[templateId] ?? body.convocatoria ?? ''}\n${sign}`
}
