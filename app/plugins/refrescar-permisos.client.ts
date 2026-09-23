import { toast } from 'vue-sonner'
import { rutaPermitida } from '~/utils/rutasPermisos'

// Mantiene los permisos de la sesión al día: si un admin los cambia (o
// desactiva la cuenta) mientras la persona tiene la app abierta, se enteran
// al volver a la pestaña o, como mucho, a los pocos minutos.
const INTERVALO_MS = 5 * 60 * 1000
const MIN_ENTRE_REFRESCOS_MS = 30 * 1000

export default defineNuxtPlugin(() => {
  const { usuarioActual, esAdmin, refrescar } = useUsuarioActual()
  const router = useRouter()
  let ultimo = Date.now()

  async function revisar() {
    if (document.visibilityState !== 'visible') return
    if (Date.now() - ultimo < MIN_ENTRE_REFRESCOS_MS) return
    ultimo = Date.now()

    if (!(await refrescar())) return
    toast.info('Tus permisos fueron actualizados')

    // Si estaba en una pantalla a la que ya no puede entrar, lo saco de ahí.
    if (!rutaPermitida(router.currentRoute.value.path, usuarioActual.value, esAdmin.value)) {
      toast.error('Ya no tenés permiso para acceder a esta sección')
      await navigateTo('/')
    }
  }

  document.addEventListener('visibilitychange', revisar)
  window.addEventListener('focus', revisar)
  setInterval(revisar, INTERVALO_MS)
})
