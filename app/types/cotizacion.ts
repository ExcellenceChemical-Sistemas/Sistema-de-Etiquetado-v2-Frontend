import type { Cliente } from './cliente'

export type EstadoCotizacion = 'RECIBIDO' | 'COTIZADO' | 'APROBADO' | 'AVISADO_ALMACEN'

export const ESTADO_COTIZACION_LABEL: Record<EstadoCotizacion, string> = {
  RECIBIDO: 'Recibido',
  COTIZADO: 'Cotizado',
  APROBADO: 'Aprobado por el cliente',
  AVISADO_ALMACEN: 'Avisado a almacén',
}

interface UsuarioResumen {
  id: number
  nombre: string
}

// Seguimiento del proceso de Joel (ver comentario en schema.prisma del backend): mismo patrón
// que Pedido, sin columna "estado" propia — el backend la deriva de qué fechas están seteadas.
// Insumos, cantidades y precio siguen viviendo en KEYFACIL ERP, no acá.
export interface Cotizacion {
  id: number
  clienteId: number
  cliente: Cliente
  numeroProforma: string | null
  notas: string | null
  requerimientoEn: string
  cotizacionEnviadaEn: string | null
  pedidoAprobadoEn: string | null
  avisoAlmacenEn: string | null
  recordatorioEnviadoEn: string | null
  creadoPorId: number
  creadoPor: UsuarioResumen
  ultimoEditadoPorId: number | null
  ultimoEditadoPor: UsuarioResumen | null
  createdAt: string
  updatedAt: string
  estado: EstadoCotizacion
}

export interface CrearCotizacionInput {
  clienteId: number
  notas?: string
  requerimientoEn?: string
}

export interface ActualizarCotizacionInput {
  clienteId?: number
  numeroProforma?: string
  notas?: string
  requerimientoEn?: string
  cotizacionEnviadaEn?: string
  pedidoAprobadoEn?: string
  avisoAlmacenEn?: string
}
