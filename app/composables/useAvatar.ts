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

  async function subirAvatar(file: File, usuarioId: string): Promise<string | null> {
    if (!validar(file)) return null

    subiendo.value = true
    try {
      const ext = EXTENSIONES_PERMITIDAS[file.type]
      const path = `${usuarioId}.${ext}`

      const supabase = useSupabaseClient()
      const { error: errorSubida } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (errorSubida) throw errorSubida

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      // Cache-busting: getPublicUrl siempre devuelve la misma URL para el mismo path,
      // así que sin esto el navegador podría seguir mostrando la imagen vieja cacheada.
      const avatarUrl = `${data.publicUrl}?v=${Date.now()}`

      const api = useApi()
      await api.patch('/usuarios/me', { avatarUrl })

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