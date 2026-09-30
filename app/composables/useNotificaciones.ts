import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Notificacion } from '~/types/notificacion'

export function useNotificacionesQuery() {
  const api = useApi()
  return useQuery({
    queryKey: ['notificaciones'],
    queryFn: async () => {
      const { data } = await api.get<Notificacion[]>('/notificaciones')
      return data
    },
    // Polling simple para que el badge del sidebar se actualice sin que el usuario recargue.
    refetchInterval: 60_000,
  })
}

export function useNotificacionesNoLeidasQuery() {
  const api = useApi()
  return useQuery({
    queryKey: ['notificaciones', 'no-leidas', 'cantidad'],
    queryFn: async () => {
      const { data } = await api.get<{ cantidad: number }>('/notificaciones/no-leidas/cantidad')
      return data.cantidad
    },
    refetchInterval: 60_000,
  })
}

function invalidarNotificaciones(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
}

export function useMarcarNotificacionLeida() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<Notificacion>(`/notificaciones/${id}/leer`)
      return data
    },
    onSuccess: () => invalidarNotificaciones(queryClient),
  })
}

export function useMarcarTodasLeidas() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.patch('/notificaciones/leer-todas')
    },
    onSuccess: () => invalidarNotificaciones(queryClient),
  })
}

export function useEliminarNotificacion() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/notificaciones/${id}`)
    },
    onSuccess: () => invalidarNotificaciones(queryClient),
  })
}
