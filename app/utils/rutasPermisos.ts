import type { Recurso, Usuario } from '~/utils/permisos'

type Nivel = 'puedeVer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar'

const RUTA_PERMISO: [string, Recurso, Nivel][] = [
  ['/fabricantes', 'FABRICANTES', 'puedeVer'],
  ['/productos', 'PRODUCTOS', 'puedeVer'],
  ['/lotes', 'LOTES', 'puedeVer'],
  ['/generar-etiqueta', 'ETIQUETAS', 'puedeCrear'],
  ['/historial', 'ETIQUETAS', 'puedeVer'],
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

/**
 * ¿Puede este usuario estar en esta ruta? Misma regla que aplica el
 * middleware al navegar; también la usa el refresco de permisos para sacar
 * al usuario de una pantalla cuyo acceso le acaban de quitar.
 */
export function rutaPermitida(path: string, usuario: Usuario | null, esAdmin: boolean) {
  const req = permisoDeRuta(path)
  if (!req) return true // ruta libre (login, /, etc.)
  if (esAdmin) return true

  // El Admin de KPIs entra a la gestión de usuarios aunque no tenga el
  // permiso USUARIOS, porque es ahí donde asigna los accesos de KPIs/ISO.
  if (
    usuario?.esAdminKpis === true &&
    RUTAS_ADMIN_KPIS.some((prefijo) => coincidePrefijo(prefijo, path))
  ) {
    return true
  }

  const permiso = usuario?.permisos.find((p) => p.recurso === req.recurso)
  return permiso?.[req.nivel] === true
}
