import type { MaybeRefOrGetter } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Proveedor, ProveedorInput } from '~/types/proveedor'

// `enabled` permite no disparar la consulta si el usuario no tiene puedeVer (evita un 403 inútil).
export function useProveedoresQuery(options: { enabled?: MaybeRefOrGetter<boolean> } = {}) {
  const api = useApi()
  return useQuery({
    enabled: options.enabled,
    queryKey: ['proveedores'],
    queryFn: async () => {
      const { data } = await api.get<Proveedor[]>('/proveedores')
      return data
    },
  })
}

export function useCreateProveedor() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProveedorInput) => {
      const { data } = await api.post<Proveedor>('/proveedores', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] })
    },
  })
}

export function useUpdateProveedor() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: ProveedorInput }) => {
      const { data } = await api.patch<Proveedor>(`/proveedores/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] })
    },
  })
}