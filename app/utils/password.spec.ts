import { describe, expect, it } from 'vitest'
import { PASSWORD_MIN, mensajeErrorPassword, validarPasswordNueva } from './password'

describe('validarPasswordNueva', () => {
  it('acepta una contraseña con largo suficiente, letras y números', () => {
    expect(validarPasswordNueva('Quimica2026x')).toBeNull()
  })

  it('rechaza una más corta que el mínimo', () => {
    expect(validarPasswordNueva('Abc12345')).toContain(String(PASSWORD_MIN))
  })

  it('acepta justo el mínimo', () => {
    expect(validarPasswordNueva('abcdefghi1')).toBeNull()
  })

  it('exige letras y números', () => {
    expect(validarPasswordNueva('1234567890')).toContain('letras y números')
    expect(validarPasswordNueva('sololetrasaqui')).toContain('letras y números')
  })

  it('rechaza repetir la contraseña actual', () => {
    expect(validarPasswordNueva('Quimica2026x', 'Quimica2026x')).toContain('distinta')
  })

  it('sin contraseña actual (recuperación) no compara', () => {
    expect(validarPasswordNueva('Quimica2026x', undefined)).toBeNull()
  })
})

describe('mensajeErrorPassword', () => {
  it('reconoce la contraseña actual incorrecta por código o por mensaje', () => {
    expect(mensajeErrorPassword({ code: 'invalid_credentials' })).toContain('actual es incorrecta')
    expect(mensajeErrorPassword({ message: 'Invalid login credentials' })).toContain('actual es incorrecta')
  })

  it('reconoce contraseña repetida, débil y límite de intentos', () => {
    expect(mensajeErrorPassword({ code: 'same_password' })).toContain('distinta')
    expect(mensajeErrorPassword({ code: 'weak_password' })).toContain('débil')
    expect(mensajeErrorPassword({ status: 429 })).toContain('Demasiados intentos')
  })

  it('cae en un mensaje genérico ante lo desconocido y no filtra el texto original', () => {
    expect(mensajeErrorPassword(new Error('boom interno'))).toBe('No se pudo cambiar la contraseña')
    expect(mensajeErrorPassword(null)).toBe('No se pudo cambiar la contraseña')
  })
})
