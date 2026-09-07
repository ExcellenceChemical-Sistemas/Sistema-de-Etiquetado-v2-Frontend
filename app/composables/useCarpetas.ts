// composables/useCarpetas.ts

/** Espeja el enum TipoCarpeta del backend (schema.prisma). */
export type TipoCarpeta = 'ANIO' | 'PROCESO' | 'PERIODO' | 'RI' | 'DS' | 'OBSOLETO'

export interface Carpeta {
  id: number
  nombre: string
  carpetaPadreId: number | null
  modulo: 'KPIS' | 'ISO'
  tipo: TipoCarpeta | null
  proceso: string | null
}

/** Espeja el enum TipoArchivoDocumento del backend. */
export type TipoArchivoDocumento = 'PDF' | 'WORD' | 'EXCEL' | 'POWERPOINT'

export interface Archivo {
  id: number
  carpetaId: number
  nombre: string
  tipo: TipoArchivoDocumento
  storagePath: string
  fechaSubida: string
}

/**
 * Un nodo del breadcrumb / cadena de ancestros que devuelve GET /carpetas/:id/ruta.
 * `tipo` es null en las carpetas que no tienen uno propio (una subcarpeta
 * anidada dentro de Obsoleto, por ejemplo): la pista de que está en esa rama
 * está en sus ancestros, ver useAccesoKpisIso.estaEnObsoleto.
 */
export interface NodoRuta {
  id: number
  nombre: string
  tipo: TipoCarpeta | null
}

export interface ContenidoCarpeta {
  carpeta: Carpeta
  subcarpetas: Carpeta[]
  archivos: Archivo[]
}

export function useCarpetas() {
  const api = useApi()

  const listarRaices = () => api.get<Carpeta[]>('/carpetas/raiz').then((r) => r.data)

  const listarContenido = (id: number) =>
    api.get<ContenidoCarpeta>(`/carpetas/${id}`).then((r) => r.data)

  const obtenerRuta = (id: number) =>
    api.get<NodoRuta[]>(`/carpetas/${id}/ruta`).then((r) => r.data)

  return { listarRaices, listarContenido, obtenerRuta }
}

// composables/useCarpetas.ts  (agregar al final del archivo existente)
export function useArchivos() {
  const api = useApi()

  const subir = (carpetaId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api
      .post(`/carpetas/${carpetaId}/archivos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  }

  const eliminar = (archivoId: number) =>
    api.delete(`/archivos/${archivoId}`).then((r) => r.data)

  const obtenerUrl = (archivoId: number) =>
    api.get<{ url: string }>(`/archivos/${archivoId}/url`).then((r) => r.data.url)

  return { subir, eliminar, obtenerUrl }
}