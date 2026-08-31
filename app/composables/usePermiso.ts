import { computed, reactive } from 'vue'
import { useUsuarioActual } from './useUsuarioActual'

export type Recurso =
  | 'LOTES'
  | 'PRODUCTOS'
  | 'FABRICANTES'
  | 'PLANTILLAS'
  | 'COA'
  | 'USUARIOS'

export function usePermiso(recurso: Recurso) {
  const { usuarioActual, esAdmin } = useUsuarioActual()

  const permiso = computed(() =>
    usuarioActual.value?.permisos.find((p) => p.recurso === recurso),
  )

  return reactive({
    puedeVer: computed(() => esAdmin.value || permiso.value?.puedeVer === true),
    puedeCrear: computed(() => esAdmin.value || permiso.value?.puedeCrear === true),
    puedeEditar: computed(() => esAdmin.value || permiso.value?.puedeEditar === true),
    puedeEliminar: computed(() => esAdmin.value || permiso.value?.puedeEliminar === true),
  })
}