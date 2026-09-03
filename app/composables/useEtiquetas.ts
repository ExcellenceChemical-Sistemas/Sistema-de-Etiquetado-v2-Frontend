import { useMutation } from '@tanstack/vue-query'
import { useApi } from './useApi'

export interface GenerarEtiquetaPayload {
  loteId: number
  plantillaId: number
  pesoBruto: string
  unidadBruto: 'KG' | 'GR'
  cantidadNeta?: string
  unidadNeta: 'KG' | 'GR' | 'ML' | 'L'
  proforma: string
}

interface EstadoTrabajo {
  id: number
  estado: 'PENDIENTE' | 'IMPRESO' | 'ERROR'
  mensajeError: string | null
}

const ENDPOINT_GENERAR = '/etiquetas/generar'
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 30000 // si el agente no responde en 30s, se corta

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// El backend ahora responde apenas crea el trabajo (estado PENDIENTE); la
// impresión física la hace el Agente de Impresión Local de forma asíncrona.
// Por eso hay que consultar GET /etiquetas/trabajos/:id hasta que el agente
// reporte IMPRESO o ERROR.
async function esperarResultado(trabajoId: number, api: ReturnType<typeof useApi>) {
  const limite = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < limite) {
    const { data } = await api.get<EstadoTrabajo>(`/etiquetas/trabajos/${trabajoId}`)

    if (data.estado === 'IMPRESO') return
    if (data.estado === 'ERROR') {
      throw new Error(data.mensajeError || 'La impresión falló en el agente local')
    }

    await esperar(POLL_INTERVAL_MS)
  }

  throw new Error(
    'La etiqueta se generó pero no se confirmó la impresión a tiempo. Verifica que el agente local esté corriendo.',
  )
}

export function useGenerarEtiqueta() {
  const api = useApi()
  return useMutation({
    mutationFn: async (dto: GenerarEtiquetaPayload) => {
      const { data } = await api.post<{ trabajoId: number }>(ENDPOINT_GENERAR, dto)
      await esperarResultado(data.trabajoId, api)
    },
  })
}