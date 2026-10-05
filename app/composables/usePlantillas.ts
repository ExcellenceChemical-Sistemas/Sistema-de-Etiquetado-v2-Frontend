import type { MaybeRefOrGetter } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useApi } from './useApi'
import type { ActualizarPlantillaInput, Plantilla, PlantillaInput } from '~/types/plantilla'

// No hay Select de plantilla visible: se auto-selecciona la única activa.
// Devuelve todas las plantillas activas (para el Select de Generar Etiqueta,
// que ahora permite elegir entre varias: estándar, en blanco, con logo, muestra).
export function usePlantillasActivas() {
  const api = useApi()
  return useQuery({
    queryKey: ['plantillas', 'activas', 'lista'],
    queryFn: async () => {
      const { data } = await api.get<Plantilla[]>('/plantillas', {
        params: { activas: true },
      })
      return data
    },
  })
}

// Listado completo (activas e inactivas) para la pantalla de administración
// de Plantillas — queryKey propia, separada de ['plantillas','activas','lista'].
export function usePlantillasQuery(options: { enabled?: MaybeRefOrGetter<boolean> } = {}) {
  const api = useApi()
  return useQuery({
    enabled: options.enabled,
    queryKey: ['plantillas'],
    queryFn: async () => {
      const { data } = await api.get<Plantilla[]>('/plantillas')
      return data
    },
  })
}

export function useCreatePlantilla() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PlantillaInput) => {
      const { data } = await api.post<Plantilla>('/plantillas', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas'] })
    },
  })
}

export function useUpdatePlantilla() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: ActualizarPlantillaInput }) => {
      const { data } = await api.patch<Plantilla>(`/plantillas/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas'] })
    },
  })
}

export function useDeletePlantilla() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/plantillas/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas'] })
    },
  })
}