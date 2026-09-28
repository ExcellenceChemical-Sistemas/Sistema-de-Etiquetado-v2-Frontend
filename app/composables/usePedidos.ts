import type { MaybeRefOrGetter } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { ActualizarPedidoInput, CrearPedidoInput, EstadoPedido, Pedido } from '~/types/pedido'

// `enabled` permite no disparar la consulta si el usuario no tiene puedeVer (evita un 403 inútil).
export function usePedidosQuery(estado: Ref<EstadoPedido | 'TODOS'>, options: { enabled?: MaybeRefOrGetter<boolean> } = {}) {
  const api = useApi()
  return useQuery({
    enabled: options.enabled,
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

// Invalida el enlace público actual (/p/<token>) y emite uno nuevo, p. ej. si el cliente lo perdió.
export function useRegenerarTokenPedido() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<Pedido>(`/pedidos/${id}/regenerar-token`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}
