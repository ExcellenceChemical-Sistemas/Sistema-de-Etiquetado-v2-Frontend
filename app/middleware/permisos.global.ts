import { toast } from 'vue-sonner'
import { useUsuarioActual } from '~/composables/useUsuarioActual'
import { rutaPermitida } from '~/utils/rutasPermisos'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (to.matched.length === 0) return

  // Sin sesión no hay nada que chequear: una ruta pública siempre es
  // permitida (rutaPermitida devuelve true si no hay sesión) y una ruta
  // privada ya la redirige auth.global.ts. Sin este chequeo, cargar()
  // disparaba igual un GET /usuarios/me sin token (401 evitable) en el
  // instante antes de loguearse o justo después de un logout.
  const { session } = useAuth()
  if (!session.value) return

  const { esAdmin, usuarioActual, cargar } = useUsuarioActual()
  await cargar()

  if (!rutaPermitida(to.path, usuarioActual.value, esAdmin.value)) {
    toast.error('No tienes permiso para acceder a esta sección')
    return navigateTo('/')
  }
})
