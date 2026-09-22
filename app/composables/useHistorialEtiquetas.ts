import { useQuery } from '@tanstack/vue-query'
import { useApi } from './useApi'

export interface EtiquetaHistorial {
  id: number
  estado: 'PENDIENTE' | 'IMPRESO' | 'ERROR'
  mensajeError: string | null
  createdAt: string
  pesoBruto: string
  unidadBruto: string
  cantidadNeta: string | null
  unidadNeta: string
  tara: string | null
  proforma: string
  token: string | null
  escaneos: number
  ultimoEscaneoAt: string | null
  plantilla: { nombre: string }
  creadoPor: { nombre: string }
  lote: {
    numeroLote: string
    producto: { nombre: string }
    fabricante: { nombre: string }
  }
}

export function useHistorialEtiquetas() {
  const api = useApi()
  return useQuery({
    queryKey: ['historial-etiquetas'],
    queryFn: async () => {
      const { data } = await api.get<EtiquetaHistorial[]>('/etiquetas/historial')
      return data
    },
  })
}
