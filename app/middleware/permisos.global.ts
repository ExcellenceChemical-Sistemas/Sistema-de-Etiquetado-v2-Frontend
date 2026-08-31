import { toast } from 'vue-sonner'
import { useUsuarioActual } from '~/composables/useUsuarioActual'
import type { Recurso } from '~/composables/usePermiso'

type Nivel = 'puedeVer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar'

const RUTA_PERMISO: [string, Recurso, Nivel][] = [
  ['/fabricantes', 'FABRICANTES', 'puedeVer'],
  ['/productos', 'PRODUCTOS', 'puedeVer'],
  ['/lotes', 'LOTES', 'puedeVer'],
  ['/generar-etiqueta', 'LOTES', 'puedeCrear'],
  ['/historial', 'LOTES', 'puedeVer'],
  ['/usuarios', 'USUARIOS', 'puedeVer'],
]

function permisoDeRuta(path: string) {
  const match = RUTA_PERMISO.find(
    ([prefix]) => path === prefix || path.startsWith(prefix + '/'),
  )
  return match ? { recurso: match[1], nivel: match[2] } : null
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (to.matched.length === 0) return

  const req = permisoDeRuta(to.path)
  if (!req) return // ruta libre (login, /, etc.)

  const { esAdmin, usuarioActual, cargar } = useUsuarioActual()
  await cargar()

  if (esAdmin.value) return

  const permiso = usuarioActual.value?.permisos.find((p) => p.recurso === req.recurso)
  if (!permiso?.[req.nivel]) {
    toast.error('No tienes permiso para acceder a esta sección')
    return navigateTo('/')
  }
})