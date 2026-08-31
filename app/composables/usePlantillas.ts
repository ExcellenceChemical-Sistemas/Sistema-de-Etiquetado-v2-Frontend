import { useQuery } from '@tanstack/vue-query'
import { useApi } from './useApi'
import type { Plantilla } from '~/types/plantilla'

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