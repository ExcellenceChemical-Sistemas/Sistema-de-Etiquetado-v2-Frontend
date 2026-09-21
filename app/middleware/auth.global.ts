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

  if (session.value && to.path === '/login') {
    return navigateTo('/')
  }
})