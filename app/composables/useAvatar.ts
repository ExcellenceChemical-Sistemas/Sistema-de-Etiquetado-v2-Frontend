import { toast } from 'vue-sonner'

const EXTENSIONES_PERMITIDAS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
}

const TAMANIO_MAXIMO = 2 * 1024 * 1024 // 2 MB

function validar(file: File): boolean {
  if (!EXTENSIONES_PERMITIDAS[file.type]) {
    toast.error('Formato no permitido. Usa PNG, JPEG o WEBP.')
    return false
  }
  if (file.size > TAMANIO_MAXIMO) {
    toast.error('La imagen no puede superar 2 MB.')
    return false
  }
  return true
}

export function useAvatar() {
  const subiendo = ref(false)

  // La foto se sube por el backend (POST /usuarios/me/avatar) y no directo a
  // Supabase Storage: así el bucket no necesita políticas de escritura para
  // cualquier usuario logueado. El backend también guarda el avatarUrl.
  async function subirAvatar(file: File): Promise<string | null> {
    if (!validar(file)) return null

    subiendo.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)

      const api = useApi()
      const { data } = await api.post<{ data: { avatarUrl: string } }>('/usuarios/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const avatarUrl = data.data.avatarUrl

      toast.success('Foto de perfil actualizada')
      return avatarUrl
    } catch (e) {
      // TEMPORAL: para ver el error real en la consola del navegador.
      // Quítalo una vez identificado el problema.
      console.error('Error subiendo avatar:', e)
      toast.error('No se pudo actualizar la foto de perfil')
      return null
    } finally {
      subiendo.value = false
    }
  }

  return { subiendo, subirAvatar }
}