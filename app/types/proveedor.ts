export interface Proveedor {
  id: number
  nombre: string
  nombreNormalizado: string
  createdAt: string
  updatedAt: string
}

export interface ProveedorInput {
  nombre: string
}