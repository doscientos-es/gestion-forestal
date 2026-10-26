import { localToday, operationalDate, type IsoDate } from './dates'

type Clock = { today(): IsoDate; id(): string }

const systemClock: Clock = {
  today: () => operationalDate(localToday()),
  id: () => crypto.randomUUID(),
}

let current: Clock = systemClock

/** Single source of "today" and new IDs; tests replace it to stay deterministic. */
export const clock: Clock = {
  today: () => current.today(),
  id: () => current.id(),
}

export function setClock(next: Partial<Clock> | null) {
  current = next ? { ...systemClock, ...next } : systemClock
}
