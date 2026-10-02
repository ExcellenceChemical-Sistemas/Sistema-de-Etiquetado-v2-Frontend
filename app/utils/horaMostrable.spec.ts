import { describe, expect, it } from 'vitest'
import { horaMostrable } from './horaMostrable'

describe('horaMostrable', () => {
  it('null/undefined pasan sin cambios', () => {
    expect(horaMostrable(null)).toBeNull()
    expect(horaMostrable(undefined)).toBeUndefined()
  })

  it('una hora antes de las 5:30pm no se toca', () => {
    const fecha = new Date(2026, 9, 1, 16, 0, 0).toISOString()
    expect(horaMostrable(fecha)).toBe(fecha)
  })

  it('exactamente las 5:30pm no se toca', () => {
    const fecha = new Date(2026, 9, 1, 17, 30, 0).toISOString()
    expect(horaMostrable(fecha)).toBe(fecha)
  })

  it('una hora después de las 5:30pm se tapa a las 5:30pm del mismo día', () => {
    const fecha = new Date(2026, 9, 1, 19, 45, 0).toISOString()
    const esperado = new Date(2026, 9, 1, 17, 30, 0).toISOString()
    expect(horaMostrable(fecha)).toBe(esperado)
  })
})
