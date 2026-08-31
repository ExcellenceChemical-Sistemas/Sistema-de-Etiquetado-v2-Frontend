import { ref, computed } from 'vue'
import { useApi } from './useApi'

interface Permiso {
  recurso: string
  puedeVer: boolean
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
}

interface UsuarioActual {
  id: number
  nombre: string
  esAdmin: boolean
  permisos: Permiso[]
  avatarUrl?: string
  email?: string
}

// Mismo patrón que useAuth: estado a nivel de módulo, compartido entre
// todos los componentes que llamen a este composable.
const usuarioActual = ref<UsuarioActual | null>(null)
const cargado = ref(false)
const cargando = ref(false)

export function useUsuarioActual() {
  async function cargar() {
    if (cargado.value || cargando.value) return
    cargando.value = true
    try {
      const api = useApi()
      const { data } = await api.get('/usuarios/me')
      usuarioActual.value = data.data
    } catch {
      // sin sesión válida todavía, o el endpoint falló — se trata como "no admin"
      usuarioActual.value = null
    } finally {
      cargado.value = true
      cargando.value = false
    }
  }

  // Por si el login/logout cambia y hay que volver a preguntar
  function reset() {
    usuarioActual.value = null
    cargado.value = false
  }

  return {
    usuarioActual,
    esAdmin: computed(() => usuarioActual.value?.esAdmin ?? false),
    cargando,
    cargar,
    reset,
  }
}