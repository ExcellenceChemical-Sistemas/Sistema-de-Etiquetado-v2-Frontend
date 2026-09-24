// Regla única para elegir una contraseña nueva (Mi cuenta y recuperación).
// Supabase aplica además su propio mínimo, que se configura en su panel: esta
// validación es la que ve el usuario antes de enviar, no la que protege.
export const PASSWORD_MIN = 10

/** Devuelve el motivo por el que la contraseña no sirve, o null si está bien. */
export function validarPasswordNueva(nueva: string, actual?: string): string | null {
  if (nueva.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`
  if (!/[A-Za-z]/.test(nueva) || !/\d/.test(nueva)) return 'La contraseña debe incluir letras y números'
  if (actual !== undefined && nueva === actual) return 'La nueva contraseña debe ser distinta de la actual'
  return null
}

/** Traduce un error de Supabase Auth al mensaje que se muestra al cambiar la contraseña. */
export function mensajeErrorPassword(e: any): string {
  const code = e?.code
  if (code === 'invalid_credentials' || e?.message === 'Invalid login credentials') {
    return 'La contraseña actual es incorrecta'
  }
  if (code === 'same_password') return 'La nueva contraseña debe ser distinta de la actual'
  if (code === 'weak_password') return 'La contraseña es demasiado débil o muy común. Elige otra más larga'
  if (code === 'over_request_rate_limit' || e?.status === 429) {
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo'
  }
  return 'No se pudo cambiar la contraseña'
}
