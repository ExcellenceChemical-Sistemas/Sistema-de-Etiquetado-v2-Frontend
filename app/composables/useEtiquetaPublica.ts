export interface EtiquetaPublica {
  producto: string
  numeroLote: string
  fabricante: string
  fechaFabricacion: string
  fechaVencimiento: string
  cantidadNeta: string | null
  unidadNeta: 'KG' | 'GR' | 'ML' | 'L'
  pesoBruto: string
  unidadBruto: 'KG' | 'GR'
  tara: string | null
  tieneCoa: boolean
  tieneFds: boolean
  pictogramasGhs: string[]
  palabraAdvertencia: 'PELIGRO' | 'ATENCION' | null
  frasesH: string[]
  frasesP: string[]
  etiquetadoEn: string
  impreso: boolean
}

// Sin useApi a propósito: esta página la abre quien escanea el QR, sin sesión,
// así que no hay Bearer que adjuntar ni cliente de Supabase que inicializar.
export function useEtiquetaPublica() {
  const { public: { apiBase } } = useRuntimeConfig()
  const base = `${apiBase}/publico/etiquetas`

  function obtener(token: string) {
    return $fetch<EtiquetaPublica>(`${base}/${encodeURIComponent(token)}`)
  }

  function urlCoa(token: string, descargar: boolean) {
    return $fetch<{ url: string }>(`${base}/${encodeURIComponent(token)}/coa`, {
      query: descargar ? { descargar: '1' } : undefined,
    })
  }

  function urlFds(token: string, descargar: boolean) {
    return $fetch<{ url: string }>(`${base}/${encodeURIComponent(token)}/fds`, {
      query: descargar ? { descargar: '1' } : undefined,
    })
  }

  return { obtener, urlCoa, urlFds }
}
