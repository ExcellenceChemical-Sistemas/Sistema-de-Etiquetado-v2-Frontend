import { describe, expect, it } from 'vitest'
import { corteLimiteAvisoAlmacen, cumplioCorteAvisoAlmacen } from './corteAvisoAlmacen'

// Fechas construidas con el constructor local a propósito (sin "Z"/UTC): la función bajo prueba
// usa Date local porque corre en el navegador del usuario (ya en hora de Perú), así que el test
// tiene que razonar en los mismos términos para ser válido sin importar el huso del runner.
describe('corteLimiteAvisoAlmacen', () => {
  it('aprobada un día hábil antes de las 5:30pm: el corte límite es las 5:30pm de ese mismo día', () => {
    // Jueves 2026-10-01, 10:00am.
    const aprobada = new Date(2026, 9, 1, 10, 0, 0)
    expect(corteLimiteAvisoAlmacen(aprobada)).toEqual(new Date(2026, 9, 1, 17, 30, 0))
  })

  it('aprobada un día hábil justo a las 5:30pm: el corte límite es ese mismo instante', () => {
    const aprobada = new Date(2026, 9, 1, 17, 30, 0)
    expect(corteLimiteAvisoAlmacen(aprobada)).toEqual(aprobada)
  })

  it('aprobada un día hábil después de las 5:30pm: el corte límite pasa al próximo día hábil', () => {
    // Jueves 2026-10-01, 6:00pm.
    const aprobada = new Date(2026, 9, 1, 18, 0, 0)
    // Viernes 2026-10-02, 5:30pm.
    expect(corteLimiteAvisoAlmacen(aprobada)).toEqual(new Date(2026, 9, 2, 17, 30, 0))
  })

  it('aprobada un sábado: el corte límite es el del próximo lunes (se salta el fin de semana)', () => {
    // Sábado 2026-10-03, 11:00am.
    const aprobada = new Date(2026, 9, 3, 11, 0, 0)
    // Lunes 2026-10-05, 5:30pm.
    expect(corteLimiteAvisoAlmacen(aprobada)).toEqual(new Date(2026, 9, 5, 17, 30, 0))
  })

  it('aprobada un feriado: el corte límite se salta al próximo día hábil', () => {
    // Año Nuevo, jueves 2026-01-01, 9:00am — feriado, no hábil.
    const aprobada = new Date(2026, 0, 1, 9, 0, 0)
    // Viernes 2026-01-02 (hábil), 5:30pm.
    expect(corteLimiteAvisoAlmacen(aprobada)).toEqual(new Date(2026, 0, 2, 17, 30, 0))
  })
})

describe('cumplioCorteAvisoAlmacen', () => {
  it('avisada antes del corte límite: cumple', () => {
    const aprobada = new Date(2026, 9, 1, 10, 0, 0) // jueves 10am
    const avisada = new Date(2026, 9, 1, 16, 0, 0) // jueves 4pm, antes del corte de las 5:30pm
    expect(cumplioCorteAvisoAlmacen(aprobada, avisada)).toBe(true)
  })

  it('avisada dentro de la ventana de despacho (5pm-5:30pm): cumple', () => {
    const aprobada = new Date(2026, 9, 1, 10, 0, 0) // jueves 10am
    const avisada = new Date(2026, 9, 1, 17, 15, 0) // jueves 5:15pm, dentro de la ventana normal de Joel
    expect(cumplioCorteAvisoAlmacen(aprobada, avisada)).toBe(true)
  })

  it('avisada justo en el corte límite: cumple', () => {
    const aprobada = new Date(2026, 9, 1, 10, 0, 0)
    const avisada = new Date(2026, 9, 1, 17, 30, 0)
    expect(cumplioCorteAvisoAlmacen(aprobada, avisada)).toBe(true)
  })

  it('avisada después del corte límite: no cumple', () => {
    const aprobada = new Date(2026, 9, 1, 10, 0, 0) // jueves 10am, corte = jueves 5:30pm
    const avisada = new Date(2026, 9, 2, 9, 0, 0) // recién viernes a la mañana
    expect(cumplioCorteAvisoAlmacen(aprobada, avisada)).toBe(false)
  })
})
