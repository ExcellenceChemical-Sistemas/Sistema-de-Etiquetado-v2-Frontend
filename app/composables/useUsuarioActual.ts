import { ref, computed } from 'vue'
import { useApi } from './useApi'
import type { Usuario } from '~/utils/permisos'

// Mismo patrón que useAuth: estado a nivel de módulo, compartido entre
// todos los componentes que llamen a este composable.
const usuarioActual = ref<Usuario | null>(null)
const cargado = ref(false)
const cargando = ref(false)

/**
 * Se incrementa en cada reset(). cargar() se guarda el valor de antes de pedir
 * y descarta la respuesta si cambió mientras el pedido estaba en vuelo: sin
 * esto, un logout durante un GET /usuarios/me en curso terminaba escribiendo
 * el usuario viejo cuando la respuesta llegaba, justo lo que reset() vino a
 * evitar.
 */
let epoca = 0

export function useUsuarioActual() {
  async function cargar() {
    if (cargado.value || cargando.value) return
    const epocaDelPedido = epoca
    cargando.value = true
    try {
      const api = useApi()
      const { data } = await api.get('/usuarios/me')
      if (epocaDelPedido !== epoca) return // hubo reset() mientras tanto
      usuarioActual.value = data.data
    } catch {
      // sin sesión válida todavía, o el endpoint falló — se trata como "no admin".
      // (Una cuenta desactivada la maneja el interceptor de useApi.)
      if (epocaDelPedido !== epoca) return
      usuarioActual.value = null
    } finally {
      // si hubo reset(), esas banderas ya las dejó él en su estado inicial
      if (epocaDelPedido === epoca) {
        cargado.value = true
        cargando.value = false
      }
    }
  }

  /**
   * Vuelve a pedir /usuarios/me sin tocar `cargado` ni vaciar el usuario, para
   * que los cambios que hizo un admin (permisos, accesos) lleguen a una sesión
   * ya abierta sin recargar la página. Devuelve true si algo cambió. Los
   * errores se ignoran: uno de red no debe deslogear ni vaciar la UI.
   */
  async function refrescar() {
    if (!usuarioActual.value || cargando.value) return false
    const epocaDelPedido = epoca
    try {
      const api = useApi()
      const { data } = await api.get('/usuarios/me')
      if (epocaDelPedido !== epoca) return false // logout o cambio de usuario en el medio
      const cambio = JSON.stringify(data.data) !== JSON.stringify(usuarioActual.value)
      if (cambio) usuarioActual.value = data.data
      return cambio
    } catch {
      return false
    }
  }

  /**
   * Vuelve al estado inicial completo para que el próximo cargar() vuelva a
   * pedir /usuarios/me en vez de cortar por el early-return. Lo llama
   * useAuth: en logout y ante cualquier cambio de usuario de la sesión
   * (expiración del token incluida).
   */
  function reset() {
    epoca++
    usuarioActual.value = null
    cargado.value = false
    cargando.value = false
  }

  return {
    usuarioActual,
    esAdmin: computed(() => usuarioActual.value?.esAdmin ?? false),
    cargado,
    cargando,
    cargar,
    refrescar,
    reset,
  }
}
