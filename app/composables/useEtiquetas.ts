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

interface EstadoVistaPrevia {
  estado: 'PENDIENTE' | 'PROCESANDO' | 'LISTA' | 'ERROR'
  imagen: string | null
  error: string | null
}

const PREVIA_TIMEOUT_MS = 25000

// Pide al agente que dibuje la etiqueta SIN imprimirla y devuelve la imagen
// (data URL). No crea ningún trabajo ni deja rastro en el historial.
export function useVistaPrevia() {
  const api = useApi()
  return useMutation({
    mutationFn: async (dto: GenerarEtiquetaPayload) => {
      const { data } = await api.post<{ id: string }>('/etiquetas/vista-previa', dto)
      const limite = Date.now() + PREVIA_TIMEOUT_MS

      while (Date.now() < limite) {
        await esperar(1000)
        const { data: previa } = await api.get<EstadoVistaPrevia>(`/etiquetas/vista-previa/${data.id}`)
        if (previa.estado === 'LISTA' && previa.imagen) return previa.imagen
        if (previa.estado === 'ERROR') {
          throw new Error(previa.error || 'No se pudo dibujar la vista previa')
        }
      }
      throw new Error('La vista previa no respondió a tiempo. Verifica que el agente de impresión esté encendido.')
    },
  })
}
