// utils/permisos.ts
// Fuente única de verdad en el frontend para los recursos/acciones de permisos.
// Debe reflejar el enum de usuarios.dto.ts (backend). Si se agrega un recurso
// allá, agregarlo también acá.

export const RECURSOS = ['LOTES', 'PRODUCTOS', 'FABRICANTES', 'PLANTILLAS', 'COA', 'USUARIOS', 'ETIQUETAS'] as const
export type Recurso = (typeof RECURSOS)[number]

export const RECURSO_LABEL: Record<Recurso, string> = {
  LOTES: 'Lotes',
  PRODUCTOS: 'Productos',
  FABRICANTES: 'Fabricantes',
  PLANTILLAS: 'Plantillas',
  COA: 'COA',
  USUARIOS: 'Usuarios',
  ETIQUETAS: 'Generar Etiquetas',
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
  permisos: Permiso[]
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