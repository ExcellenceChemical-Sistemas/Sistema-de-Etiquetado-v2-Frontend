export type TipoNotificacion = 'PEDIDO_VENCIDO' | 'COTIZACION_SIN_AVISO_ALMACEN'

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
