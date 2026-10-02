import { describe, it, expect } from 'vitest'
import { horasHabilesEntre } from './horasHabiles'

describe('horasHabilesEntre', () => {
  it('fin anterior o igual a inicio da 0', () => {
    expect(horasHabilesEntre('2026-09-02T10:00:00', '2026-09-02T09:00:00')).toBe(0)
    expect(horasHabilesEntre('2026-09-02T10:00:00', '2026-09-02T10:00:00')).toBe(0)
  })

  it('mismo día dentro del horario laboral: cuenta las horas tal cual', () => {
    // miércoles 2026-09-02
    expect(horasHabilesEntre('2026-09-02T08:00:00', '2026-09-02T10:00:00')).toBe(2)
  })

  it('recorta antes de que abra la jornada (7:30)', () => {
    expect(horasHabilesEntre('2026-09-02T06:00:00', '2026-09-02T09:00:00')).toBeCloseTo(1.5)
  })

  it('recorta después de que cierra la jornada (17:30)', () => {
    expect(horasHabilesEntre('2026-09-02T16:00:00', '2026-09-02T19:00:00')).toBeCloseTo(1.5)
  })

  it('un rango completamente fuera de jornada (de noche) da 0', () => {
    expect(horasHabilesEntre('2026-09-02T19:00:00', '2026-09-02T23:00:00')).toBe(0)
  })

  it('el fin de semana no cuenta: de viernes a lunes solo suma las porciones laborales de cada extremo', () => {
    // viernes 2026-09-04 16:00 -> sábado/domingo nada -> lunes 2026-09-07 09:00
    const horas = horasHabilesEntre('2026-09-04T16:00:00', '2026-09-07T09:00:00')
    expect(horas).toBeCloseTo(1.5 + 1.5) // viernes 16:00-17:30, lunes 7:30-9:00
  })

  it('un feriado peruano dentro del rango tampoco cuenta', () => {
    // miércoles 2026-10-07 16:00 -> feriado jueves 2026-10-08 (Combate de Angamos) -> viernes 2026-10-09 09:00
    const horas = horasHabilesEntre('2026-10-07T16:00:00', '2026-10-09T09:00:00')
    expect(horas).toBeCloseTo(1.5 + 1.5) // miércoles 16:00-17:30, viernes 7:30-9:00, jueves excluido
  })

  it('varios días laborales completos seguidos suman 10h por día (7:30 a 17:30)', () => {
    // lunes a miércoles completos: 2026-09-07, 08, 09
    const horas = horasHabilesEntre('2026-09-07T07:30:00', '2026-09-09T17:30:00')
    expect(horas).toBeCloseTo(30)
  })
})
