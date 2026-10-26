import { addDays, addWorkingDays, type IsoDate } from '@/shared/lib/dates'

import type { Absence, BudgetLine, BudgetParams } from '../application/model'

export type SeedWorkState = 'facturada' | 'terminada' | 'en_curso' | 'planificada' | 'pendiente'

export type SeedWork = {
  title: string
  clientId: string
  zoneId: string
  crewId: string
  start: IsoDate
  lines: BudgetLine[]
  /** Actual yield ÷ budgeted yield. */
  yieldFactor: number
  state: SeedWorkState
  invoice?: 'cobrada' | 'enviada'
  margin?: number
}

export const defaultParams: BudgetParams = {
  crewSize: 5,
  dailyCost: 16_000,
  travelPerCrewDay: 9_000,
  targetMargin: 0.2,
}

/** Line IDs are assigned per budget by `withLineIds` to keep the seed deterministic. */
export function planting(
  speciesId: string,
  hectares: number,
  density: number,
  yieldPerDay: number,
): BudgetLine {
  return { id: '', kind: 'plantacion', speciesId, hectares, density, yieldPerDay }
}

export function treatment(
  description: string,
  hectares: number,
  hectaresPerDay: number,
): BudgetLine {
  return { id: '', kind: 'tratamiento', description, hectares, hectaresPerDay }
}

export function withLineIds(budgetId: string, lines: BudgetLine[]): BudgetLine[] {
  return lines.map((line, index) => ({ ...line, id: `${budgetId}-l${index + 1}` }))
}

/**
 * Two planting seasons. Historic dates are absolute (the demo targets autumn);
 * current work is relative to the anchor Monday so the agenda always looks live.
 */
export function seedWorks(year: number, anchor: IsoDate): SeedWork[] {
  const prev = year - 1
  const rel = (workingDays: number) => addWorkingDays(anchor, workingDays)
  return [
    {
      title: 'Repoblación ladera norte',
      clientId: 'c-valdemonte',
      zoneId: 'z-norte',
      crewId: 'cr-norte',
      start: `${prev}-01-13`,
      lines: [planting('s-radiata', 14, 1600, 420)],
      yieldFactor: 0.93,
      state: 'facturada',
      invoice: 'cobrada',
    },
    {
      title: 'Restauración de ribera · tramo 1',
      clientId: 'c-diputacion',
      zoneId: 'z-ribera',
      crewId: 'cr-sur',
      start: `${prev}-02-03`,
      lines: [planting('s-roble', 6, 1100, 300), treatment('Desbroce previo', 6, 0.5)],
      yieldFactor: 1.04,
      state: 'facturada',
      invoice: 'cobrada',
    },
    {
      title: 'Castañar Finca Los Robles',
      clientId: 'c-robles',
      zoneId: 'z-ribera',
      crewId: 'cr-monte',
      start: `${prev}-02-17`,
      lines: [planting('s-castano', 4, 800, 260)],
      yieldFactor: 0.86,
      state: 'facturada',
      invoice: 'cobrada',
      margin: 0.24,
    },
    {
      title: 'Monte Alto · lote 1',
      clientId: 'c-diputacion',
      zoneId: 'z-alto',
      crewId: 'cr-norte',
      start: `${prev}-03-03`,
      lines: [planting('s-laricio', 18, 1500, 430)],
      yieldFactor: 0.97,
      state: 'facturada',
      invoice: 'cobrada',
      margin: 0.18,
    },
    {
      title: 'Hayedo Sierra Este',
      clientId: 'c-sanlorenzo',
      zoneId: 'z-este',
      crewId: 'cr-monte',
      start: `${prev}-03-17`,
      lines: [planting('s-haya', 8, 1200, 280)],
      yieldFactor: 0.9,
      state: 'facturada',
      invoice: 'cobrada',
    },
    {
      title: 'Reposición de marras',
      clientId: 'c-sanlorenzo',
      zoneId: 'z-este',
      crewId: 'cr-sur',
      start: `${prev}-10-20`,
      lines: [planting('s-radiata', 10, 600, 450)],
      yieldFactor: 1.02,
      state: 'facturada',
      invoice: 'cobrada',
    },
    {
      title: 'Franja cortafuegos Costa Oeste',
      clientId: 'c-valdemonte',
      zoneId: 'z-costa',
      crewId: 'cr-norte',
      start: `${prev}-11-10`,
      lines: [planting('s-roble', 7, 1000, 300), treatment('Desbroce mecanizado', 7, 0.7)],
      yieldFactor: 0.95,
      state: 'facturada',
      invoice: 'cobrada',
    },
    {
      title: 'Maderas del Norte · parcela 12',
      clientId: 'c-maderas',
      zoneId: 'z-norte',
      crewId: 'cr-monte',
      start: `${prev}-11-24`,
      lines: [planting('s-radiata', 22, 1600, 420)],
      yieldFactor: 1.0,
      state: 'facturada',
      invoice: 'cobrada',
      margin: 0.16,
    },
    {
      title: 'Restauración de taludes · embalse',
      clientId: 'c-aguas',
      zoneId: 'z-este',
      crewId: 'cr-sur',
      start: `${prev}-04-07`,
      lines: [planting('s-abedul', 8, 1100, 320), treatment('Hidrosiembra y fajinas', 8, 0.6)],
      yieldFactor: 0.98,
      state: 'facturada',
      invoice: 'cobrada',
    },
    {
      title: 'Parque periurbano Valdemonte',
      clientId: 'c-valdemonte',
      zoneId: 'z-norte',
      crewId: 'cr-monte',
      start: `${prev}-10-06`,
      lines: [planting('s-roble', 5, 900, 300), planting('s-haya', 3, 900, 280)],
      yieldFactor: 0.94,
      state: 'facturada',
      invoice: 'cobrada',
      margin: 0.22,
    },
    {
      title: 'Repoblación Pinares · lote A',
      clientId: 'c-pinares',
      zoneId: 'z-alto',
      crewId: 'cr-norte',
      start: `${prev}-12-01`,
      lines: [planting('s-radiata', 26, 1600, 420)],
      yieldFactor: 1.01,
      state: 'facturada',
      invoice: 'cobrada',
      margin: 0.15,
    },
    {
      title: 'Cortafuegos verdes Ribera',
      clientId: 'c-ribera',
      zoneId: 'z-ribera',
      crewId: 'cr-sur',
      start: `${prev}-12-15`,
      lines: [planting('s-castano', 6, 800, 260), treatment('Clareo previo', 6, 0.5)],
      yieldFactor: 0.91,
      state: 'facturada',
      invoice: 'cobrada',
    },

    {
      title: 'Repoblación ladera norte · fase 2',
      clientId: 'c-valdemonte',
      zoneId: 'z-norte',
      crewId: 'cr-norte',
      start: `${year}-01-12`,
      lines: [planting('s-radiata', 12, 1600, 420)],
      yieldFactor: 1.03,
      state: 'facturada',
      invoice: 'cobrada',
    },
    {
      title: 'Restauración de ribera · tramo 2',
      clientId: 'c-diputacion',
      zoneId: 'z-ribera',
      crewId: 'cr-sur',
      start: `${year}-02-02`,
      lines: [planting('s-roble', 7, 1100, 300), treatment('Desbroce previo', 7, 0.5)],
      yieldFactor: 1.08,
      state: 'facturada',
      invoice: 'cobrada',
    },
    {
      title: 'Monte Alto · lote 2',
      clientId: 'c-diputacion',
      zoneId: 'z-alto',
      crewId: 'cr-norte',
      start: `${year}-02-23`,
      lines: [planting('s-laricio', 16, 1500, 430)],
      yieldFactor: 1.01,
      state: 'facturada',
      invoice: 'enviada',
      margin: 0.18,
    },
    {
      title: 'Abedular Monte Alto',
      clientId: 'c-asociacion',
      zoneId: 'z-alto',
      crewId: 'cr-sur',
      start: `${year}-03-16`,
      lines: [planting('s-abedul', 5, 1100, 320)],
      yieldFactor: 1.05,
      state: 'facturada',
      invoice: 'cobrada',
    },
    {
      title: 'Repoblación Pinares · lote B',
      clientId: 'c-pinares',
      zoneId: 'z-alto',
      crewId: 'cr-norte',
      start: `${year}-04-06`,
      lines: [planting('s-radiata', 24, 1600, 420)],
      yieldFactor: 1.04,
      state: 'facturada',
      invoice: 'cobrada',
      margin: 0.15,
    },
    {
      title: 'Arboleda urbana Ribera Baja',
      clientId: 'c-ribera',
      zoneId: 'z-ribera',
      crewId: 'cr-sur',
      start: `${year}-04-20`,
      lines: [planting('s-roble', 4, 600, 250), planting('s-abedul', 2, 600, 300)],
      yieldFactor: 1.1,
      state: 'facturada',
      invoice: 'cobrada',
    },
    {
      title: 'Castaños de la Cooperativa',
      clientId: 'c-cooperativa',
      zoneId: 'z-este',
      crewId: 'cr-monte',
      start: `${year}-05-11`,
      lines: [planting('s-castano', 7, 800, 260)],
      yieldFactor: 0.9,
      state: 'facturada',
      invoice: 'cobrada',
      margin: 0.25,
    },
    {
      title: 'Ribera del embalse · fase 2',
      clientId: 'c-aguas',
      zoneId: 'z-este',
      crewId: 'cr-sur',
      start: `${year}-06-01`,
      lines: [planting('s-abedul', 7, 1100, 320), treatment('Hidrosiembra y fajinas', 7, 0.6)],
      yieldFactor: 1.02,
      state: 'facturada',
      invoice: 'enviada',
    },
    {
      title: 'Hayedo Sierra Este · fase 2',
      clientId: 'c-sanlorenzo',
      zoneId: 'z-este',
      crewId: 'cr-monte',
      start: rel(-20),
      lines: [planting('s-haya', 6, 1200, 280)],
      yieldFactor: 0.97,
      state: 'terminada',
    },
    {
      title: 'Maderas del Norte · parcela 14',
      clientId: 'c-maderas',
      zoneId: 'z-norte',
      crewId: 'cr-monte',
      start: rel(-9),
      lines: [planting('s-radiata', 20, 1600, 420)],
      yieldFactor: 0.88,
      state: 'en_curso',
      margin: 0.16,
    },
    {
      title: 'Castañar Finca Los Robles · ampliación',
      clientId: 'c-robles',
      zoneId: 'z-ribera',
      crewId: 'cr-norte',
      start: rel(-4),
      lines: [planting('s-castano', 9, 800, 260)],
      yieldFactor: 1.06,
      state: 'en_curso',
      margin: 0.24,
    },
    {
      title: 'Reposición de marras · 2.ª campaña',
      clientId: 'c-sanlorenzo',
      zoneId: 'z-este',
      crewId: 'cr-sur',
      start: rel(-2),
      lines: [planting('s-radiata', 11, 600, 450)],
      yieldFactor: 1.0,
      state: 'en_curso',
    },
    {
      title: 'Franja cortafuegos Costa Oeste · fase 2',
      clientId: 'c-valdemonte',
      zoneId: 'z-costa',
      crewId: 'cr-norte',
      start: rel(5),
      lines: [planting('s-roble', 8, 1000, 300)],
      yieldFactor: 1,
      state: 'planificada',
    },
    {
      title: 'Repoblación con abedul · Asociación',
      clientId: 'c-asociacion',
      zoneId: 'z-alto',
      crewId: 'cr-sur',
      start: rel(10),
      lines: [planting('s-abedul', 6, 1100, 320), treatment('Ahoyado mecanizado', 6, 0.8)],
      yieldFactor: 1,
      state: 'pendiente',
    },
  ]
}

export function seedAbsences(year: number, anchor: IsoDate): Absence[] {
  const rel = (workingDays: number) => addWorkingDays(anchor, workingDays)
  // Ane's approved holidays overlap next week's planned work on purpose (planning conflict).
  const base = { note: '', requestedOn: addDays(anchor, -20) }
  return [
    {
      ...base,
      id: 'a-1',
      personId: 'p-ane',
      type: 'vacaciones',
      start: rel(6),
      end: rel(8),
      status: 'aprobada',
    },
    {
      ...base,
      id: 'a-2',
      personId: 'p-unai',
      type: 'vacaciones',
      start: rel(15),
      end: rel(19),
      status: 'solicitada',
      note: 'Viaje familiar',
      requestedOn: addDays(anchor, -1),
    },
    {
      ...base,
      id: 'a-3',
      personId: 'p-sergio',
      type: 'permiso',
      start: rel(3),
      end: rel(3),
      status: 'aprobada',
      note: 'Asunto propio',
    },
    {
      ...base,
      id: 'a-4',
      personId: 'p-laura',
      type: 'baja',
      start: rel(-8),
      end: rel(-6),
      status: 'aprobada',
    },
    {
      ...base,
      id: 'a-5',
      personId: 'p-inigo',
      type: 'vacaciones',
      start: `${year}-08-03`,
      end: `${year}-08-14`,
      status: 'aprobada',
    },
    {
      ...base,
      id: 'a-6',
      personId: 'p-david',
      type: 'vacaciones',
      start: rel(11),
      end: rel(13),
      status: 'solicitada',
      requestedOn: addDays(anchor, -2),
    },
    {
      ...base,
      id: 'a-7',
      personId: 'p-unai',
      type: 'vacaciones',
      start: `${year}-07-20`,
      end: `${year}-07-31`,
      status: 'aprobada',
    },
  ]
}
