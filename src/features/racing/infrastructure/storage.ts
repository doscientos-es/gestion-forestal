import type { Workshop } from '../domain/model'
import { seedWorkshop } from './seed'

export const WORKSHOP_KEY = 'riera-racing:demo:v1'

export function loadWorkshop(storage: Pick<Storage, 'getItem'>): Workshop {
  const raw = storage.getItem(WORKSHOP_KEY)
  if (!raw) return seedWorkshop()
  try {
    const data = JSON.parse(raw) as Workshop
    if (data.version !== 1 || !Array.isArray(data.projects) || !Array.isArray(data.parts) || !Array.isArray(data.products) || !Array.isArray(data.purchases) || !Array.isArray(data.invoices) || !Array.isArray(data.absences)) throw new Error('Formato no reconocido')
    return data
  } catch {
    throw new Error('No se pueden leer los datos guardados. Restablece la demo para recuperar los datos de ejemplo.')
  }
}

export function saveWorkshop(storage: Pick<Storage, 'setItem'>, state: Workshop) {
  storage.setItem(WORKSHOP_KEY, JSON.stringify(state))
}