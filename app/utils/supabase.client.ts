import { createClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createClient> | null = null

export function useSupabaseClient() {
  if (!client) {
    const config = useRuntimeConfig()
    client = createClient(
      config.public.supabaseUrl as string,
      config.public.supabaseAnonKey as string,
    )
  }
  return client
}