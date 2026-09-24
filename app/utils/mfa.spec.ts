import { describe, expect, it } from 'vitest'
import { mensajeErrorMfa, necesitaVerificarMfa, normalizarCodigo } from './mfa'

describe('necesitaVerificarMfa', () => {
  it('pide el código si tiene el factor activo y la sesión es solo de contraseña', () => {
    expect(necesitaVerificarMfa({ currentLevel: 'aal1', nextLevel: 'aal2' })).toBe(true)
  })

  it('no lo pide si ya verificó (aal2)', () => {
    expect(necesitaVerificarMfa({ currentLevel: 'aal2', nextLevel: 'aal2' })).toBe(false)
  })

  it('no lo pide si no activó el segundo factor', () => {
    expect(necesitaVerificarMfa({ currentLevel: 'aal1', nextLevel: 'aal1' })).toBe(false)
  })

  it('ante datos ausentes no bloquea (el backend igual lo exige)', () => {
    expect(necesitaVerificarMfa(null)).toBe(false)
    expect(necesitaVerificarMfa(undefined)).toBe(false)
    expect(necesitaVerificarMfa({ currentLevel: null, nextLevel: null })).toBe(false)
  })
})

describe('normalizarCodigo', () => {
  it('acepta 6 dígitos, con o sin espacios', () => {
    expect(normalizarCodigo('123456')).toBe('123456')
    expect(normalizarCodigo('123 456')).toBe('123456')
    expect(normalizarCodigo('  123456 ')).toBe('123456')
  })

  it('rechaza lo que no son exactamente 6 dígitos', () => {
    expect(normalizarCodigo('12345')).toBeNull()
    expect(normalizarCodigo('1234567')).toBeNull()
    expect(normalizarCodigo('12a456')).toBeNull()
    expect(normalizarCodigo('')).toBeNull()
  })
})

describe('mensajeErrorMfa', () => {
  it('explica un código incorrecto o vencido', () => {
    expect(mensajeErrorMfa({ code: 'mfa_verification_failed' })).toContain('incorrecto')
    expect(mensajeErrorMfa({ code: 'mfa_challenge_expired' })).toContain('venció')
  })

  it('avisa si el segundo factor no está habilitado en Supabase', () => {
    expect(mensajeErrorMfa({ code: 'mfa_totp_enroll_not_enabled' })).toContain('Supabase')
  })

  it('reconoce el límite de intentos por código o por status', () => {
    expect(mensajeErrorMfa({ code: 'over_request_rate_limit' })).toContain('Demasiados intentos')
    expect(mensajeErrorMfa({ status: 429 })).toContain('Demasiados intentos')
  })

  it('cae en un mensaje genérico y no filtra el texto original', () => {
    expect(mensajeErrorMfa(new Error('detalle interno'))).toBe('No se pudo completar la verificación')
    expect(mensajeErrorMfa(null)).toBe('No se pudo completar la verificación')
  })
})
