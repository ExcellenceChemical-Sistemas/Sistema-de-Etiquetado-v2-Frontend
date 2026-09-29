import type { MaybeRefOrGetter } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { ActualizarCotizacionInput, CrearCotizacionInput, Cotizacion, EstadoCotizacion } from '~/types/cotizacion'

export function useCotizacionesQuery(estado: Ref<EstadoCotizacion | 'TODOS'>, options: { enabled?: MaybeRefOrGetter<boolean> } = {}) {
  const api = useApi()
  return useQuery({
    enabled: options.enabled,
    queryKey: ['cotizaciones', estado],
    queryFn: async () => {
      const { data } = await api.get<Cotizacion[]>('/cotizaciones', {
        params: estado.value !== 'TODOS' ? { estado: estado.value } : undefined,
      })
      return data
    },
  })
}

export function useCreateCotizacion() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CrearCotizacionInput) => {
      const { data } = await api.post<Cotizacion>('/cotizaciones', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })
    },
  })
}

export function useUpdateCotizacion() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: ActualizarCotizacionInput }) => {
      const { data } = await api.patch<Cotizacion>(`/cotizaciones/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })
    },
  })
}

export function useMarcarCotizacionEnviada() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<Cotizacion>(`/cotizaciones/${id}/marcar-enviada`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })
    },
  })
}

export function useDeleteCotizacion() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/cotizaciones/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })
    },
  })
}
