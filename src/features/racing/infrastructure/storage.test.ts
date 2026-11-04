import { describe, expect, it } from 'vitest'

import { seedWorkshop } from './seed'
import { loadWorkshop, saveWorkshop, WORKSHOP_KEY } from './storage'

describe('almacenamiento local de la demo', () => {
  it('conserva cambios con una clave propia y recupera los datos', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value)
      },
    }
    const state = seedWorkshop()
    state.projects = state.projects.map((project) => ({ ...project, title: 'Cambio guardado' }))
    saveWorkshop(storage, state)
    expect(values.has(WORKSHOP_KEY)).toBe(true)
    expect(loadWorkshop(storage).projects[0]?.title).toBe('Cambio guardado')
  })

  it('no sustituye silenciosamente datos corruptos', () => {
    expect(() => loadWorkshop({ getItem: () => '{' })).toThrow('No se pueden leer')
  })
})
