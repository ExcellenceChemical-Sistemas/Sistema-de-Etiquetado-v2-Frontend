import { useMutation } from '@tanstack/vue-query'
import axios from 'axios'
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

const ENDPOINT_GENERAR = '/etiquetas/generar'

// El backend (EtiquetasController @Post('generar')) imprime de forma SÍNCRONA
// antes de responder: la request queda colgada hasta que termina el trabajo
// de impresión física. Por eso el .vue debe mostrar loading mientras dura
// esta mutation (puede tardar varios segundos).
export function useGenerarEtiqueta() {
  const api = useApi()
  return useMutation({
    mutationFn: async (dto: GenerarEtiquetaPayload) => {
      try {
        // Ya no se muestra thumbnail en el frontend, pero igual hay que pedir
        // 'arraybuffer' porque la respuesta es binaria (image/png); si se
        // deja el responseType por defecto, Axios intenta parsear el PNG
        // como JSON y explota.
        await api.post<ArrayBuffer>(ENDPOINT_GENERAR, dto, {
          responseType: 'arraybuffer',
        })
      } catch (error) {
        // ⚠️ Con responseType: 'arraybuffer', el body de un error HTTP
        // (ej. el 502 que tira ImpresionService cuando la impresora falla)
        // también llega como ArrayBuffer, NO como JSON parseado. Si no se
        // decodifica a mano acá, el toast de error queda genérico/vacío.
        if (axios.isAxiosError(error) && error.response?.data instanceof ArrayBuffer) {
          let mensaje = 'No se pudo generar la etiqueta'
          try {
            const texto = new TextDecoder().decode(error.response.data)
            const parsed = JSON.parse(texto)
            if (parsed?.message) mensaje = parsed.message
          } catch {
            // el body no era JSON parseable, se usa el mensaje genérico
          }
          throw new Error(mensaje)
        }
        throw error
      }
    },
  })
}
