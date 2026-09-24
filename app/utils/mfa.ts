// Lógica pura del segundo factor (TOTP de Supabase Auth). El nivel de la sesión es
// `aal1` (solo contraseña) o `aal2` (contraseña + código de la app autenticadora).

export interface NivelAal {
  currentLevel: string | null
  nextLevel: string | null
}

/** Tiene el segundo factor activado pero esta sesión todavía no lo verificó. */
export function necesitaVerificarMfa(nivel: NivelAal | null | undefined): boolean {
  return nivel?.nextLevel === 'aal2' && nivel.currentLevel !== 'aal2'
}

/** Acepta el código como lo teclea la gente: "123 456" o "123456". Devuelve null si no son 6 dígitos. */
export function normalizarCodigo(entrada: string): string | null {
  const limpio = entrada.replace(/\s+/g, '')
  return /^\d{6}$/.test(limpio) ? limpio : null
}

/** Traduce un error de Supabase Auth al mensaje que se muestra en el flujo del segundo factor. */
export function mensajeErrorMfa(e: any): string {
  switch (e?.code) {
    case 'mfa_verification_failed':
    case 'mfa_verification_rejected':
      return 'Código incorrecto o vencido. Revisa tu app e inténtalo de nuevo'
    case 'mfa_challenge_expired':
      return 'El código venció. Genera uno nuevo en tu app e inténtalo de nuevo'
    case 'mfa_totp_enroll_not_enabled':
    case 'mfa_totp_verify_not_enabled':
      return 'La verificación en dos pasos no está habilitada en Supabase. Actívala en Authentication → Multi-Factor'
    case 'insufficient_aal':
      return 'Verifica primero tu código actual para hacer este cambio'
    case 'over_request_rate_limit':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo'
  }
  if (e?.status === 429) return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo'
  return 'No se pudo completar la verificación'
}
