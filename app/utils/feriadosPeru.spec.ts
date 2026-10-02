import { describe, it, expect } from 'vitest'
import { esFeriadoPeru } from './feriadosPeru'

describe('esFeriadoPeru', () => {
  it('reconoce los feriados fijos', () => {
    expect(esFeriadoPeru(new Date(2026, 0, 1))).toBe(true) // Año Nuevo
    expect(esFeriadoPeru(new Date(2026, 6, 28))).toBe(true) // Fiestas Patrias
    expect(esFeriadoPeru(new Date(2026, 11, 25))).toBe(true) // Navidad
  })

  it('un día cualquiera que no es feriado da false', () => {
    expect(esFeriadoPeru(new Date(2026, 8, 2))).toBe(false) // miércoles común
  })

  it('un feriado fijo de otro mes/día con la misma fecha numérica no se confunde', () => {
    expect(esFeriadoPeru(new Date(2026, 0, 28))).toBe(false) // día 28, pero de enero, no julio
  })

  it('calcula Jueves y Viernes Santo a partir de la Pascua de ese año (2026: Pascua 5 de abril)', () => {
    expect(esFeriadoPeru(new Date(2026, 3, 2))).toBe(true) // Jueves Santo
    expect(esFeriadoPeru(new Date(2026, 3, 3))).toBe(true) // Viernes Santo
    expect(esFeriadoPeru(new Date(2026, 3, 4))).toBe(false) // Sábado, no feriado
  })

  it('Jueves y Viernes Santo caen en fechas distintas según el año', () => {
    // Pascua 2025 fue el 20 de abril: Jueves Santo 17, Viernes Santo 18.
    expect(esFeriadoPeru(new Date(2025, 3, 17))).toBe(true)
    expect(esFeriadoPeru(new Date(2025, 3, 18))).toBe(true)
    expect(esFeriadoPeru(new Date(2025, 3, 2))).toBe(false) // el Jueves Santo de 2026, no de 2025
  })
})
