import { localToday, operationalDate, type IsoDate } from './dates'

type Clock = { today(): IsoDate; now(): string; id(): string }

const systemClock: Clock = {
  today: () => operationalDate(localToday()),
  now: () => new Date().toISOString(),
  id: () => crypto.randomUUID(),
}

let current: Clock = systemClock

/** Single source of "today", the current instant and new IDs; tests replace it to stay deterministic. */
export const clock: Clock = {
  today: () => current.today(),
  now: () => current.now(),
  id: () => current.id(),
}

export function setClock(next: Partial<Clock> | null) {
  current = next ? { ...systemClock, ...next } : systemClock
}
