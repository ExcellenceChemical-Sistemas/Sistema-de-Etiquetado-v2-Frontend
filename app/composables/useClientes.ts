import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { ActualizarClienteInput, Cliente, ClienteInput } from '~/types/cliente'

// Trae todos los clientes de una (son ~300) y el filtrado lo hace
// Searchcombobox en memoria — mismo patrón que ya usan los combobox de lote.
export function useClientesQuery() {
  const api = useApi()
  return useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data } = await api.get<Cliente[]>('/clientes')
      return data
    },
  })
}

export function useCreateCliente() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ClienteInput) => {
      const { data } = await api.post<Cliente>('/clientes', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

export function useUpdateCliente() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: ActualizarClienteInput }) => {
      const { data } = await api.patch<Cliente>(`/clientes/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

export function useDeleteCliente() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/clientes/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}
