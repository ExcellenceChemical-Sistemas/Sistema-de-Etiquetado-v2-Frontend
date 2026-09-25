export interface Producto {
  id: number
  nombre: string
  nombreNormalizado: string
  createdAt: string
  updatedAt: string
  nfpaSalud?: number | null
  nfpaInflamabilidad?: number | null
  nfpaReactividad?: number | null
  densidad?: number | null
  pictogramasGhs?: string[]
  palabraAdvertencia?: 'PELIGRO' | 'ATENCION' | null
  frasesH?: string[]
  frasesP?: string[]
  fichaSeguridadUrl?: string | null
  fichaTecnicaUrl?: string | null
}

export interface CreateProductoDto {
  nombre: string
}

export interface UpdateProductoDto {
  nombre: string
}