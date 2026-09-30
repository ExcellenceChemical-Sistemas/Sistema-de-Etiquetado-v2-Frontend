export type TipoNotificacion = 'PEDIDO_VENCIDO'

export interface Notificacion {
  id: number
  usuarioId: number
  tipo: TipoNotificacion
  mensaje: string
  pedidoId: number | null
  leidaEn: string | null
  createdAt: string
}
