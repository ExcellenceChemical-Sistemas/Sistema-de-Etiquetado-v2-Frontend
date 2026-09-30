import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Ausencia, CrearAusenciaInput } from '~/types/ausencia'

export function useAusenciasQuery() {
  const api = useApi()
  return useQuery({
    queryKey: ['ausencias'],
    queryFn: async () => {
      const { data } = await api.get<Ausencia[]>('/ausencias')
      return data
    },
  })
}

export function useCreateAusencia() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CrearAusenciaInput) => {
      const { data } = await api.post<Ausencia>('/ausencias', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ausencias'] })
    },
  })
}

export function useDeleteAusencia() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/ausencias/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ausencias'] })
    },
  })
}
