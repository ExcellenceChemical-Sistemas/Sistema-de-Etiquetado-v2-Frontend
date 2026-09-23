import { toast } from 'vue-sonner'
import { useUsuarioActual } from '~/composables/useUsuarioActual'
import { rutaPermitida } from '~/utils/rutasPermisos'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (to.matched.length === 0) return

  const { esAdmin, usuarioActual, cargar } = useUsuarioActual()
  await cargar()

  if (!rutaPermitida(to.path, usuarioActual.value, esAdmin.value)) {
    toast.error('No tienes permiso para acceder a esta sección')
    return navigateTo('/')
  }
})
