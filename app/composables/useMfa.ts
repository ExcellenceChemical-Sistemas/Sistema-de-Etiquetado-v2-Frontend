import { normalizarCodigo, necesitaVerificarMfa } from '~/utils/mfa'

// Segundo factor (TOTP) con Supabase Auth. Todo va directo a Supabase; el backend
// solo comprueba el nivel de la sesión (`aal2`) en cada request (SupabaseAuthGuard).
export function useMfa() {
  const supabase = useSupabaseClient()

  /** Devuelve el factor TOTP verificado de la cuenta, o null si no lo activó. */
  async function factorActivo() {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) throw error
    return data.totp[0] ?? null // `totp` ya trae solo los verificados
  }

  /** ¿Esta sesión tiene el factor activo pero todavía no verificó el código? */
  async function faltaVerificar(): Promise<boolean> {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error) throw error
    return necesitaVerificarMfa(data)
  }

  /**
   * Empieza a activarlo: devuelve el QR y el secreto para la app autenticadora.
   * Un intento abandonado deja un factor sin verificar que haría fallar el
   * siguiente `enroll`, así que se limpian primero.
   */
  async function iniciarActivacion() {
    const { data: lista, error: errorLista } = await supabase.auth.mfa.listFactors()
    if (errorLista) throw errorLista
    for (const f of lista.all.filter((x) => x.factor_type === 'totp' && x.status === 'unverified')) {
      await supabase.auth.mfa.unenroll({ factorId: f.id })
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'App autenticadora',
    })
    if (error) throw error
    return { factorId: data.id, qr: data.totp.qr_code, secreto: data.totp.secret }
  }

  /** Confirma la activación con el primer código. Al verificarse, la sesión pasa a aal2. */
  async function confirmarActivacion(factorId: string, codigo: string) {
    const code = normalizarCodigo(codigo)
    if (!code) throw Object.assign(new Error('codigo'), { code: 'mfa_verification_failed' })
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) throw error
  }

  /** Abandona una activación a medias (cierra el diálogo sin confirmar). */
  async function cancelarActivacion(factorId: string) {
    await supabase.auth.mfa.unenroll({ factorId }).catch(() => {})
  }

  /** Verifica el código al iniciar sesión: la sesión pasa de aal1 a aal2. */
  async function verificarInicio(codigo: string) {
    const code = normalizarCodigo(codigo)
    if (!code) throw Object.assign(new Error('codigo'), { code: 'mfa_verification_failed' })
    const factor = await factorActivo()
    if (!factor) throw Object.assign(new Error('sin factor'), { code: 'mfa_factor_not_found' })
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
    if (error) throw error
  }

  /** Lo desactiva. Supabase lo permite solo desde una sesión ya verificada (aal2). */
  async function desactivar(factorId: string) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) throw error
  }

  return {
    factorActivo,
    faltaVerificar,
    iniciarActivacion,
    confirmarActivacion,
    cancelarActivacion,
    verificarInicio,
    desactivar,
  }
}
