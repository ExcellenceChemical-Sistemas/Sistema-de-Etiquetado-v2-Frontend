import type { Cliente } from './cliente'

export type EstadoCotizacion = 'PENDIENTE_ENVIO' | 'ENVIADO'

export const ESTADO_COTIZACION_LABEL: Record<EstadoCotizacion, string> = {
  PENDIENTE_ENVIO: 'Falta enviar a almacén',
  ENVIADO: 'Enviado a almacén',
}

interface UsuarioResumen {
  id: number
  nombre: string
}

// Referencia liviana a una cotización que Joel ya armó en KEYFACIL ERP (insumos, cantidades y
// precio viven ahí, no acá). Sirve para no perder el pedido camino a almacén.
export interface Cotizacion {
  id: number
  clienteId: number
  cliente: Cliente
  numeroProforma: string
  notas: string | null
  estado: EstadoCotizacion
  enviadoEn: string | null
  enviadoPorId: number | null
  enviadoPor: UsuarioResumen | null
  recordatorioEnviadoEn: string | null
  creadoPorId: number
  creadoPor: UsuarioResumen
  createdAt: string
  updatedAt: string
}

export interface CrearCotizacionInput {
  clienteId: number
  numeroProforma: string
  notas?: string
}

export interface ActualizarCotizacionInput {
  clienteId?: number
  numeroProforma?: string
  notas?: string
}
