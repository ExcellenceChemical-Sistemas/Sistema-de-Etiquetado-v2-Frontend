import { toast } from 'vue-sonner'
import { useUsuarioActual } from '~/composables/useUsuarioActual'
import type { Recurso } from '~/utils/permisos'

type Nivel = 'puedeVer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar'

const RUTA_PERMISO: [string, Recurso, Nivel][] = [
  ['/fabricantes', 'FABRICANTES', 'puedeVer'],
  ['/productos', 'PRODUCTOS', 'puedeVer'],
  ['/lotes', 'LOTES', 'puedeVer'],
  ['/generar-etiqueta', 'ETIQUETAS', 'puedeCrear'],
  ['/historial', 'ETIQUETAS', 'puedeVer'],
  ['/estadisticas', 'ETIQUETAS', 'puedeVer'],
  ['/usuarios', 'USUARIOS', 'puedeVer'],
  ['/pedidos', 'PEDIDOS', 'puedeVer'],
  ['/clientes', 'PEDIDOS', 'puedeVer'],
]

/**
 * Rutas donde además entra el Admin de KPIs (esAdminKpis), que gestiona los
 * accesos de KPIs/ISO de otros usuarios sin ser admin general. Solo lo deja
 * llegar a la pantalla: no le da permisos sobre el resto de los módulos ni
 * acceso propio al contenido de KPIs/ISO.
 */
const RUTAS_ADMIN_KPIS = ['/usuarios']

function coincidePrefijo(prefijo: string, path: string) {
  return path === prefijo || path.startsWith(prefijo + '/')
}

function permisoDeRuta(path: string) {
  const match = RUTA_PERMISO.find(([prefijo]) => coincidePrefijo(prefijo, path))
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

  // El Admin de KPIs entra a la gestión de usuarios aunque no tenga el
  // permiso USUARIOS, porque es ahí donde asigna los accesos de KPIs/ISO.
  if (
    usuarioActual.value?.esAdminKpis === true &&
    RUTAS_ADMIN_KPIS.some((prefijo) => coincidePrefijo(prefijo, to.path))
  ) {
    return
  }

  const permiso = usuarioActual.value?.permisos.find((p) => p.recurso === req.recurso)
  if (!permiso?.[req.nivel]) {
    toast.error('No tienes permiso para acceder a esta sección')
    return navigateTo('/')
  }
})
