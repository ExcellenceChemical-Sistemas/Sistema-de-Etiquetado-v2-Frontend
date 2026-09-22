import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
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

// `habilitado`: por defecto pide siempre. Pásalo cuando quien mire la página puede
// no tener ETIQUETAS:puedeVer (ej. el Inicio, que todos ven) — evita el 403.
export function useHistorialEtiquetas(habilitado: MaybeRefOrGetter<boolean> = true) {
  const api = useApi()
  return useQuery({
    queryKey: ['historial-etiquetas'],
    queryFn: async () => {
      const { data } = await api.get<EtiquetaHistorial[]>('/etiquetas/historial')
      return data
    },
    enabled: habilitado,
  })
}
