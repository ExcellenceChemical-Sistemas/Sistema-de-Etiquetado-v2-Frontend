import type { MaybeRefOrGetter } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useApi } from './useApi'
import type { Producto, CreateProductoDto, UpdateProductoDto } from '~/types/producto'

// `enabled` permite no disparar la consulta si el usuario no tiene puedeVer (evita un 403 inútil).
export function useProductos(options: { enabled?: MaybeRefOrGetter<boolean> } = {}) {
  const api = useApi()
  return useQuery({
    enabled: options.enabled,
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
export function useUploadFichaSeguridad() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post<Producto>(`/productos/${id}/ficha-seguridad`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
    },
  })
}

// GET de la ficha como mutation (no query) a propósito: la signed URL expira
// a los 5 minutos, así que no conviene cachearla — se pide fresca cada vez que
// el usuario hace clic en "Ver ficha de seguridad".
export function useVerFichaSeguridad() {
  const api = useApi()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.get<{ url: string }>(`/productos/${id}/ficha-seguridad`)
      return data.url
    },
  })
}


export interface ClasificacionFds {
  pictogramasGhs: string[]
  palabraAdvertencia: 'PELIGRO' | 'ATENCION' | null
  frasesH: string[]
  frasesP: string[]
  noPeligroso: boolean
}

// Lee una FDS (PDF) y devuelve la clasificación GHS propuesta. No guarda nada.
export function useAnalizarFicha() {
  const api = useApi()
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post<ClasificacionFds>('/productos/analizar-ficha', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
  })
}
