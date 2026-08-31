import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useApi } from './useApi'
import type { Producto, CreateProductoDto, UpdateProductoDto } from '~/types/producto'

export function useProductos() {
  const api = useApi()
  return useQuery({
    queryKey: ['productos'],
    queryFn: async () => {
      const { data } = await api.get<Producto[]>('/productos')
      return data
    },
  })
}

export function useCreateProducto() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dto: CreateProductoDto) => {
      const { data } = await api.post<Producto>('/productos', dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
    },
  })
}

export function useUpdateProducto() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dto }: { id: number; dto: UpdateProductoDto }) => {
      const { data } = await api.patch<Producto>(`/productos/${id}`, dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
    },
  })
}