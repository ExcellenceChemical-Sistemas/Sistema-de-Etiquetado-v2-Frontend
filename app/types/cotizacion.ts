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

export type TipoAlertaCotizacion = 'FERIADO_O_FIN_DE_SEMANA' | 'AUSENCIA_REGISTRADA' | 'CARGA_TARDIA'

export interface AlertaCotizacion {
  campo: 'requerimientoEn' | 'cotizacionEnviadaEn' | 'pedidoAprobadoEn' | 'avisoAlmacenEn'
  tipo: TipoAlertaCotizacion
  motivo?: string
}

export const ALERTA_COTIZACION_LABEL: Record<TipoAlertaCotizacion, string> = {
  FERIADO_O_FIN_DE_SEMANA: 'cae en fin de semana o feriado (la empresa no trabaja ese día)',
  AUSENCIA_REGISTRADA: 'cae dentro de una ausencia registrada de quien cargó el dato',
  CARGA_TARDIA: 'se cargó o corrigió en el sistema mucho después de la fecha que dice',
}

export const CAMPO_COTIZACION_LABEL: Record<'requerimientoEn' | 'numeroProforma' | AlertaCotizacion['campo'], string> = {
  requerimientoEn: 'Requerimiento',
  numeroProforma: 'N° Proforma',
  cotizacionEnviadaEn: 'Cotización enviada',
  pedidoAprobadoEn: 'Pedido aprobado',
  avisoAlmacenEn: 'Aviso a almacén',
}

export interface HistorialCotizacionItem {
  id: number
  campo: string
  valorAnterior: string | null
  valorNuevo: string | null
  editadoPor: { id: number; nombre: string }
  editadoEn: string
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
  alertas: AlertaCotizacion[]
  historial: HistorialCotizacionItem[]
}

// requerimientoEn no se manda al crear: el backend siempre usa la hora real del servidor (ver
// CrearCotizacionDto en el backend). Corregirla después es exclusivo de un Admin (ActualizarCotizacionInput).
export interface CrearCotizacionInput {
  clienteId: number
  notas?: string
}

export interface ActualizarCotizacionInput {
  clienteId?: number
  numeroProforma?: string
  notas?: string
  requerimientoEn?: string
  cotizacionEnviadaEn?: string
  pedidoAprobadoEn?: string
  avisoAlmacenEn?: string
  motivoCorreccion?: string
}
