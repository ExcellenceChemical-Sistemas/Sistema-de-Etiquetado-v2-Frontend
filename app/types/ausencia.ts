interface UsuarioResumen {
  id: number
  nombre: string
}

export interface Ausencia {
  id: number
  usuarioId: number
  usuario: UsuarioResumen
  desde: string
  hasta: string
  motivo: string | null
  registradoPorId: number
  registradoPor: UsuarioResumen
  createdAt: string
}

export interface CrearAusenciaInput {
  usuarioId: number
  desde: string
  hasta: string
  motivo?: string
}
