import { useQuery } from '@tanstack/vue-query'
import type { Ref } from 'vue'
import { useApi } from './useApi'

export interface AlertaImpresion {
  tipo: 'AGENTE' | 'COLA' | 'IMPRESORA'
  severidad: 'error' | 'aviso'
  mensaje: string
}

export interface EstadoImpresion {
  agenteConectado: boolean
  ultimoContactoHaceSeg: number | null
  pendientes: number
  minutosEsperando: number
  alertas: AlertaImpresion[]
}

const CADA_MS = 15000

// Estado del agente de impresión y de la impresora (papel, tinta...). Se consulta
// cada pocos segundos mientras la sesión esté abierta.
export function useEstadoImpresion(habilitado: Ref<boolean>) {
  const api = useApi()
  return useQuery({
    queryKey: ['estado-impresion'],
    queryFn: async () => {
      const { data } = await api.get<EstadoImpresion>('/etiquetas/agente/estado')
      return data
    },
    enabled: habilitado,
    refetchInterval: CADA_MS,
    staleTime: 0,
    retry: 0,
  })
}
