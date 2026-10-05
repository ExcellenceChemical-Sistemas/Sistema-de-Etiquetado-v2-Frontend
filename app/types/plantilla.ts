export interface Plantilla {
  id: number
  nombre: string
  archivo: string
  activa: boolean
  createdAt: string
  updatedAt: string
}

export interface PlantillaInput {
  nombre: string
  archivo: string
  activa?: boolean
}

export type ActualizarPlantillaInput = Partial<PlantillaInput>
