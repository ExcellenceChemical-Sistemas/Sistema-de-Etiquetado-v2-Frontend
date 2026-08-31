export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  // ruta que no existe: dejamos que Nuxt muestre su página de error,
  // no la forzamos a pasar por login primero
  if (to.matched.length === 0) return

  const { session, init } = useAuth()
  await init()

  const rutasPublicas = ['/login', '/olvide-password', '/restablecer-password']

  if (!session.value && !rutasPublicas.includes(to.path)) {
    return navigateTo('/login')
  }

  if (session.value && to.path === '/login') {
    return navigateTo('/')
  }
})