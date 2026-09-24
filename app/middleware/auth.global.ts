export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  // ruta que no existe: dejamos que Nuxt muestre su página de error,
  // no la forzamos a pasar por login primero
  if (to.matched.length === 0) return

  const { session, init } = useAuth()
  await init()

  const rutasPublicas = ['/login', '/olvide-password', '/restablecer-password']
  // /e/<token>: página de trazabilidad que abre quien escanea el QR de la
  // etiqueta; no tiene sesión y no la necesita.
  const esRutaPublica = rutasPublicas.includes(to.path) || to.path.startsWith('/e/')

  if (!session.value && !esRutaPublica) {
    return navigateTo('/login')
  }

  // Segundo factor: con el factor activado, la contraseña sola (sesión aal1) no
  // da acceso a la app; hay que pasar por /verificar-mfa. Esto es comodidad de
  // navegación: quien de verdad lo exige es el backend en cada request.
  if (session.value && !esRutaPublica) {
    let falta = false
    try {
      falta = await useMfa().faltaVerificar()
    } catch {
      // Si no se puede saber, no se bloquea acá: el backend responde MFA_REQUERIDO igual.
    }
    if (falta && to.path !== '/verificar-mfa') return navigateTo('/verificar-mfa')
    if (!falta && to.path === '/verificar-mfa') return navigateTo('/')
  }

  if (session.value && to.path === '/login') {
    return navigateTo('/')
  }
})