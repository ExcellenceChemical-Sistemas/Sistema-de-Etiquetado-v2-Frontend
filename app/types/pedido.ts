import type { Cliente } from './cliente'

export type EstadoPedido = 'RECIBIDO' | 'EN_PREPARACION' | 'PREPARADO' | 'SALIO' | 'ENTREGADO'

export const CATEGORIAS_OBSERVACION_PEDIDO = [
  'INSUMO_EN_IMPORTACION',
  'INSUMO_SIN_STOCK',
  'RECOGE_EN_ALMACEN',
  'IMPORTACION_EXPORTACION',
  'CANCELADO',
  'OTRO',
] as const
export type CategoriaObservacionPedido = (typeof CATEGORIAS_OBSERVACION_PEDIDO)[number]

export const CATEGORIA_OBSERVACION_LABEL: Record<CategoriaObservacionPedido, string> = {
  INSUMO_EN_IMPORTACION: 'Insumo en importación',
  INSUMO_SIN_STOCK: 'Insumo sin stock',
  RECOGE_EN_ALMACEN: 'Recoge en almacén',
  IMPORTACION_EXPORTACION: 'Importación / Exportación',
  CANCELADO: 'Cancelado',
  OTRO: 'Otro',
}

export const ESTADO_PEDIDO_LABEL: Record<EstadoPedido, string> = {
  RECIBIDO: 'Recibido',
  EN_PREPARACION: 'En preparación',
  PREPARADO: 'Preparado',
  SALIO: 'Salió de almacén',
  ENTREGADO: 'Entregado',
}

interface UsuarioResumen {
  id: number
  nombre: string
}

export interface Pedido {
  id: number
  clienteId: number
  cliente: Cliente
  numeroProforma: string
  recibidoEn: string
  inicioPreparacionEn: string | null
  preparadoEn: string | null
  salioEn: string | null
  entregadoEn: string | null
  categoriaObservacion: CategoriaObservacionPedido | null
  detalleObservacion: string | null
  creadoPorId: number
  creadoPor: UsuarioResumen
  ultimoEditadoPorId: number | null
  ultimoEditadoPor: UsuarioResumen | null
  createdAt: string
  updatedAt: string
  estado: EstadoPedido
}

export interface CrearPedidoInput {
  clienteId: number
  numeroProforma: string
  recibidoEn?: string
}

export interface ActualizarPedidoInput {
  recibidoEn?: string
  inicioPreparacionEn?: string
  preparadoEn?: string
  salioEn?: string
  entregadoEn?: string
  categoriaObservacion?: CategoriaObservacionPedido
  detalleObservacion?: string
}
