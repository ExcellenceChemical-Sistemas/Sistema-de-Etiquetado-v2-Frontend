import axios from 'axios'

let instance: ReturnType<typeof axios.create> | null = null

export function useApi() {
  if (!instance) {
    const config = useRuntimeConfig()
    instance = axios.create({
      baseURL: config.public.apiBase,
      headers: { 'Content-Type': 'application/json' },
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