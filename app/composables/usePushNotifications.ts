import { toast } from 'vue-sonner'

// La clave pública se pide al backend (no se hornea en el build del frontend): así hay un solo
// lugar donde vive el par de claves VAPID y nunca puede desincronizarse entre los dos repos.
function base64UrlABytes(base64Url: string): BufferSource {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return buffer
}

export function usePushNotifications() {
  const api = useApi()
  const soportado = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  const suscrito = ref(false)
  const cargando = ref(false)

  async function suscripcionActual(): Promise<PushSubscription | null> {
    if (!soportado) return null
    const registro = await navigator.serviceWorker.getRegistration('/sw.js')
    return (await registro?.pushManager.getSubscription()) ?? null
  }

  async function refrescarEstado() {
    suscrito.value = Boolean(await suscripcionActual())
  }

  async function activar() {
    if (!soportado) {
      toast.error('Este navegador no soporta notificaciones push')
      return
    }
    cargando.value = true
    try {
      const permiso = await Notification.requestPermission()
      if (permiso !== 'granted') {
        toast.error('Permiso de notificaciones denegado')
        return
      }

      const { data } = await api.get<{ clave: string | null }>('/notificaciones/push/clave-publica')
      if (!data.clave) {
        toast.error('Push no está configurado en el servidor todavía')
        return
      }

      const registro = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlABytes(data.clave),
        }))

      await api.post('/notificaciones/push/suscripciones', sub.toJSON())
      suscrito.value = true
      toast.success('Notificaciones push activadas')
    } catch {
      toast.error('No se pudo activar las notificaciones push')
    } finally {
      cargando.value = false
    }
  }

  async function desactivar() {
    cargando.value = true
    try {
      const sub = await suscripcionActual()
      if (sub) {
        await api.delete('/notificaciones/push/suscripciones', { data: { endpoint: sub.endpoint } })
        await sub.unsubscribe()
      }
      suscrito.value = false
      toast.success('Notificaciones push desactivadas')
    } catch {
      toast.error('No se pudo desactivar las notificaciones push')
    } finally {
      cargando.value = false
    }
  }

  return { soportado, suscrito, cargando, refrescarEstado, activar, desactivar }
}
