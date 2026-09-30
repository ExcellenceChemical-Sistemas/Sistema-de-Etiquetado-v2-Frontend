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

// Pedido con el mismo numeroProforma que la cotización (única llave que las cruza hoy, no hay
// relación formal en el schema — ver CLAUDE.md del backend). Viene tanto en GET /cotizaciones (para
// el indicador de trazabilidad) como en GET /cotizaciones/:id.
export interface PedidoRelacionado {
  id: number
  numeroProforma: string
  recibidoEn: string
  inicioPreparacionEn: string | null
  preparadoEn: string | null
  salioEn: string | null
  entregadoEn: string | null
  tokenSeguimiento: string
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
  // Presente en GET /cotizaciones y GET /cotizaciones/:id; ausente en la respuesta de crear/actualizar
  // (esas rutas no hacen el lookup bulk — ver adjuntarPedidosRelacionados en el backend).
  pedidoRelacionado?: PedidoRelacionado | null
}

// requerimientoEn es de carga libre (ver CAMPOS_PROTEGIDOS en el backend): si no se manda, el
// backend usa la hora del servidor; si se manda, se usa tal cual, sin restricción de Admin.
export interface CrearCotizacionInput {
  clienteId: number
  requerimientoEn?: string
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
