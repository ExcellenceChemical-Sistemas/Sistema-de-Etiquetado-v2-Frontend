export interface Producto {
  id: number
  nombre: string
  nombreNormalizado: string
  createdAt: string
  updatedAt: string
  nfpaSalud?: number | null
  nfpaInflamabilidad?: number | null
  nfpaReactividad?: number | null
  fichaSeguridadUrl?: string | null
}

export interface CreateProductoDto {
  nombre: string
}

export interface UpdateProductoDto {
  nombre: string
}