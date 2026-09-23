// utils/permisos.ts
// Fuente única de verdad en el frontend para los recursos/acciones de permisos.
// Debe reflejar el enum de usuarios.dto.ts (backend). Si se agrega un recurso
// allá, agregarlo también acá.

// COA no es un recurso propio: subir/reemplazar/eliminar el COA de un lote se
// controla con LOTES.puedeEditar (ver lotes.controller.ts en el backend). No
// se lista acá para no ofrecer en el grid un permiso que ningún guard consulta.
export const RECURSOS = ['LOTES', 'PRODUCTOS', 'FABRICANTES', 'PLANTILLAS', 'USUARIOS', 'ETIQUETAS', 'PEDIDOS'] as const
export type Recurso = (typeof RECURSOS)[number]

export const RECURSO_LABEL: Record<Recurso, string> = {
  LOTES: 'Lotes',
  PRODUCTOS: 'Productos',
  FABRICANTES: 'Fabricantes',
  PLANTILLAS: 'Plantillas',
  USUARIOS: 'Usuarios',
  ETIQUETAS: 'Generar Etiquetas',
  PEDIDOS: 'Pedidos',
}

export const ACCIONES = [
  { key: 'puedeVer', label: 'Ver' },
  { key: 'puedeCrear', label: 'Crear' },
  { key: 'puedeEditar', label: 'Editar' },
  { key: 'puedeEliminar', label: 'Eliminar' },
] as const

export interface PermisoAcciones {
  puedeVer: boolean
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
}

export type PermisosState = Record<Recurso, PermisoAcciones>

export interface Permiso extends PermisoAcciones {
  recurso: Recurso
}

export interface Usuario {
  id: number
  nombre: string
  email?: string
  esAdmin: boolean
  /** false = cuenta desactivada por un admin (sin acceso, historial conservado). Ausente = activa. */
  activo?: boolean
  /**
   * Gestiona accesos de KPIs/ISO de otros usuarios. NO implica acceso propio
   * al contenido: para ver algo dentro de KPIs/ISO necesita que se le asignen
   * sus propios accesos, igual que a cualquier otro usuario.
   * Opcional hasta que corra la migración que agrega el campo en el backend.
   */
  esAdminKpis?: boolean
  /** Lo devuelve /usuarios/me; null o ausente si el usuario no subió foto. */
  avatarUrl?: string | null
  permisos: Permiso[]
  accesosIndicador?: AccesoIndicador[]
  accesoIso?: AccesoISO | null
}

/** Crea un estado inicial en blanco (los 6 módulos en false) */
export function crearPermisosStateVacio(): PermisosState {
  return Object.fromEntries(
    RECURSOS.map((r) => [r, { puedeVer: false, puedeCrear: false, puedeEditar: false, puedeEliminar: false }])
  ) as PermisosState
}

/** Vuelca los permisos que trae un usuario (array parcial) sobre un PermisosState en blanco */
export function poblarPermisosState(state: PermisosState, permisos: Permiso[]) {
  for (const p of permisos) {
    if (state[p.recurso]) {
      state[p.recurso] = {
        puedeVer: p.puedeVer,
        puedeCrear: p.puedeCrear,
        puedeEditar: p.puedeEditar,
        puedeEliminar: p.puedeEliminar,
      }
    }
  }
}

/** Convierte un PermisosState de vuelta al array que espera el backend */
export function permisosStateAArray(state: PermisosState): Permiso[] {
  return RECURSOS.map((recurso) => ({ recurso, ...state[recurso] }))
}


// ─── KPIs / Documentación ISO ───
// Modelo granular de 5 permisos booleanos independientes por ámbito (sección
// 1.1 de contexto-fase3-kpis-iso.md). Reemplaza a los niveles fijos
// LECTURA/ESCRITURA y VISUALIZACION/EDICION_TOTAL, que quedaron obsoletos
// junto con los enums TipoAccesoIndicador/TipoAccesoISO del backend.

export const PROCESOS_INDICADOR = [
  'COMERCIAL',
  'COMPRAS',
  'ALMACEN_DISTRIBUCION',
  'CONTROL_CALIDAD',
  'SGC',
  'DIRECCION_PLANEAMIENTO',
  'RRHH',
  'SERVICIOS_GENERALES',
] as const
export type ProcesoIndicador = (typeof PROCESOS_INDICADOR)[number]

export const PROCESO_INDICADOR_LABEL: Record<ProcesoIndicador, string> = {
  COMERCIAL: 'Comercial',
  COMPRAS: 'Compras',
  ALMACEN_DISTRIBUCION: 'Almacén y Distribución',
  CONTROL_CALIDAD: 'Control de Calidad',
  SGC: 'SGC',
  DIRECCION_PLANEAMIENTO: 'Dirección y Planeamiento',
  RRHH: 'RR.HH',
  SERVICIOS_GENERALES: 'Servicios Generales',
}

/** Las 5 acciones del modelo granular, en el orden en que van en el grid. */
export const ACCIONES_DOCUMENTO = [
  { key: 'puedeVer', label: 'Ver' },
  { key: 'puedeDescargar', label: 'Descargar' },
  { key: 'puedeAdjuntar', label: 'Adjuntar' },
  { key: 'puedeEditar', label: 'Editar' },
  { key: 'puedeEliminar', label: 'Eliminar' },
] as const
export type AccionDocumento = (typeof ACCIONES_DOCUMENTO)[number]['key']

export interface AccesoDocumentoAcciones {
  puedeVer: boolean
  puedeDescargar: boolean
  puedeAdjuntar: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
}

/** Fila de accesos_indicador: los 5 flags para un proceso concreto. */
export interface AccesoIndicador extends AccesoDocumentoAcciones {
  proceso: ProcesoIndicador
}

/**
 * Fila de accesos_iso: los 5 flags para ISO en general + la carpeta Obsoleto.
 * gestionaObsoleto acopla ver+editar de Obsoleto en un solo booleano a
 * propósito (punto 3 de la sesión 9); no se desglosa en los 5.
 */
export interface AccesoISO extends AccesoDocumentoAcciones {
  gestionaObsoleto: boolean
}

export type AccesosKpisIsoState = {
  indicador: Record<ProcesoIndicador, AccesoDocumentoAcciones>
  iso: AccesoISO
}

function accionesVacias(): AccesoDocumentoAcciones {
  return {
    puedeVer: false,
    puedeDescargar: false,
    puedeAdjuntar: false,
    puedeEditar: false,
    puedeEliminar: false,
  }
}

/** true si tiene al menos un flag activo, o sea si hace falta una fila en la BD. */
function tieneAlgunAcceso(acciones: AccesoDocumentoAcciones): boolean {
  return ACCIONES_DOCUMENTO.some(({ key }) => acciones[key])
}

export function crearAccesosKpisIsoStateVacio(): AccesosKpisIsoState {
  return {
    indicador: Object.fromEntries(
      PROCESOS_INDICADOR.map((p) => [p, accionesVacias()])
    ) as Record<ProcesoIndicador, AccesoDocumentoAcciones>,
    iso: { ...accionesVacias(), gestionaObsoleto: false },
  }
}

/**
 * Acepta cualquier objeto que traiga los accesos, no un Usuario completo: la
 * respuesta de GET /usuarios/:id/accesos-kpis-iso es parcial (id, nombre,
 * avatarUrl + accesos), sin permisos ni esAdmin.
 *
 * Copia campo por campo a propósito: las filas de accesosIndicador traen el id
 * de Prisma, que cambia en cada guardado porque el PATCH borra y recrea las
 * filas. Acá se indexa por `proceso`, que es la clave estable.
 */
export function poblarAccesosKpisIsoState(
  state: AccesosKpisIsoState,
  usuario: Pick<Usuario, 'accesosIndicador' | 'accesoIso'>,
) {
  for (const proceso of PROCESOS_INDICADOR) {
    state.indicador[proceso] = accionesVacias()
  }

  for (const a of usuario.accesosIndicador ?? []) {
    // proceso desconocido = enum desincronizado con el backend, se ignora
    if (!state.indicador[a.proceso]) continue
    state.indicador[a.proceso] = {
      puedeVer: a.puedeVer,
      puedeDescargar: a.puedeDescargar,
      puedeAdjuntar: a.puedeAdjuntar,
      puedeEditar: a.puedeEditar,
      puedeEliminar: a.puedeEliminar,
    }
  }

  const iso = usuario.accesoIso
  state.iso = iso
    ? {
        puedeVer: iso.puedeVer,
        puedeDescargar: iso.puedeDescargar,
        puedeAdjuntar: iso.puedeAdjuntar,
        puedeEditar: iso.puedeEditar,
        puedeEliminar: iso.puedeEliminar,
        gestionaObsoleto: iso.gestionaObsoleto,
      }
    : { ...accionesVacias(), gestionaObsoleto: false }
}

/**
 * Convierte el estado al DTO del backend. Los procesos sin ningún flag activo
 * no se mandan (el backend borra la fila), y accesoIso va en null cuando no
 * hay nada marcado — mismo criterio que tenía SIN_ACCESO con los niveles.
 */
export function accesosKpisIsoStateADto(state: AccesosKpisIsoState) {
  return {
    accesosIndicador: PROCESOS_INDICADOR.filter((p) => tieneAlgunAcceso(state.indicador[p])).map((p) => ({
      proceso: p,
      ...state.indicador[p],
    })),
    accesoIso:
      tieneAlgunAcceso(state.iso) || state.iso.gestionaObsoleto ? { ...state.iso } : null,
  }
}
