import axios from 'axios'
import { toast } from 'vue-sonner'

let instance: ReturnType<typeof axios.create> | null = null

export function useApi() {
  if (!instance) {
    const config = useRuntimeConfig()
    instance = axios.create({
      baseURL: config.public.apiBase,
      headers: { 'Content-Type': 'application/json' },
    })

    // Una cuenta desactivada por un admin responde 403 con este código en
    // cualquier endpoint: se cierra la sesión al instante, sin esperar a que
    // la persona recargue. Con `cerrandoSesion` se evita repetirlo cuando
    // varios requests en vuelo fallan a la vez.
    let cerrandoSesion = false
    instance.interceptors.response.use(undefined, async (error) => {
      if (error?.response?.status === 403 && error.response.data?.code === 'CUENTA_DESACTIVADA' && !cerrandoSesion) {
        cerrandoSesion = true
        try {
          toast.error(error.response.data.message ?? 'Tu cuenta está desactivada')
          await useAuth().logout()
          await navigateTo('/login')
        } finally {
          cerrandoSesion = false
        }
      }
      return Promise.reject(error)
    })

    instance.interceptors.request.use(async (requestConfig) => {
      const supabase = useSupabaseClient()
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`
      }

      return requestConfig
    })
  }
  return instance
}