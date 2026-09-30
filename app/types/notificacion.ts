export type TipoNotificacion =
  | 'PEDIDO_VENCIDO'
  | 'PEDIDO_SALIO_SIN_ENTREGAR'
  | 'COTIZACION_SIN_AVISO_ALMACEN'
  | 'COTIZACION_RESPUESTA_LENTA'
  | 'RESUMEN_DIARIO'

export interface Notificacion {
  id: number
  usuarioId: number
  tipo: TipoNotificacion
  mensaje: string
  pedidoId: number | null
  cotizacionId: number | null
  leidaEn: string | null
  createdAt: string
}
