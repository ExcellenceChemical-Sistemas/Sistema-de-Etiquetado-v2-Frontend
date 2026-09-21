import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useApi } from './useApi'
import type { Lote, CreateLoteDto, UpdateLoteDto } from '~/types/lote'

export function useLotes() {
  const api = useApi()
  return useQuery({
    queryKey: ['lotes'],
    queryFn: async () => {
      const { data } = await api.get<Lote[]>('/lotes')
      return data
    },
  })
}

export function useCreateLote() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dto: CreateLoteDto) => {
      const { data } = await api.post<Lote>('/lotes', dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotes'] })
    },
  })
}

export function useUpdateLote() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dto }: { id: number; dto: UpdateLoteDto }) => {
      const { data } = await api.patch<Lote>(`/lotes/${id}`, dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotes'] })
    },
  })
}

export function useDeleteLote() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<Lote>(`/lotes/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotes'] })
    },
  })
}

export function useUploadCoa() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post<Lote>(`/lotes/${id}/coa`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotes'] })
    },
  })
}

export function useDeleteCoa() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<Lote>(`/lotes/${id}/coa`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotes'] })
    },
  })
}

// GET del COA como mutation (no query) a propósito: la signed URL expira
// en minutos, así que no conviene cachearla — se pide fresca cada vez que
// el usuario hace clic en "Ver COA".
export function useVerCoa() {
  const api = useApi()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.get<{ url: string }>(`/lotes/${id}/coa`)
      return data.url
    },
  })
}