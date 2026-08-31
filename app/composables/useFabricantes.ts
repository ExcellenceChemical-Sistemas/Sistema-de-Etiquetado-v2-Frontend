import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Fabricante, FabricanteInput } from '~/types/fabricante'

export function useFabricantesQuery() {
  const api = useApi()
  return useQuery({
    queryKey: ['fabricantes'],
    queryFn: async () => {
      const { data } = await api.get<Fabricante[]>('/fabricantes')
      return data
    },
  })
}

export function useCreateFabricante() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: FabricanteInput) => {
      const { data } = await api.post<Fabricante>('/fabricantes', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabricantes'] })
    },
  })
}

export function useUpdateFabricante() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: FabricanteInput }) => {
      const { data } = await api.patch<Fabricante>(`/fabricantes/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabricantes'] })
    },
  })
}