import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { ActualizarPedidoInput, CrearPedidoInput, EstadoPedido, Pedido } from '~/types/pedido'

export function usePedidosQuery(estado: Ref<EstadoPedido | 'TODOS'>) {
  const api = useApi()
  return useQuery({
    queryKey: ['pedidos', estado],
    queryFn: async () => {
      const { data } = await api.get<Pedido[]>('/pedidos', {
        params: estado.value !== 'TODOS' ? { estado: estado.value } : undefined,
      })
      return data
    },
  })
}

export function useCreatePedido() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CrearPedidoInput) => {
      const { data } = await api.post<Pedido>('/pedidos', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}

export function useUpdatePedido() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: ActualizarPedidoInput }) => {
      const { data } = await api.patch<Pedido>(`/pedidos/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}

export function useDeletePedido() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/pedidos/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}
