export interface Fabricante {
  id: number
  nombre: string
  nombreNormalizado: string
  createdAt: string
  updatedAt: string
}

export interface FabricanteInput {
  nombre: string
}