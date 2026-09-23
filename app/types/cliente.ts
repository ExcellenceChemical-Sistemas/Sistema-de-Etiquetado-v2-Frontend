export type TipoDocumentoCliente = 'RUC' | 'DNI' | 'CARNET_EXTRANJERIA'

export interface Cliente {
  id: number
  nombre: string
  nombreNormalizado: string
  tipoDocumento: TipoDocumentoCliente | null
  numeroDocumento: string | null
  direccion: string | null
  celular: string | null
  createdAt: string
}

export interface ClienteInput {
  nombre: string
  tipoDocumento?: TipoDocumentoCliente
  numeroDocumento?: string
  direccion?: string
  celular?: string
}

export type ActualizarClienteInput = Partial<ClienteInput>

export const TIPOS_DOCUMENTO_CLIENTE: TipoDocumentoCliente[] = ['RUC', 'DNI', 'CARNET_EXTRANJERIA']

export const TIPO_DOCUMENTO_CLIENTE_LABEL: Record<TipoDocumentoCliente, string> = {
  RUC: 'RUC',
  DNI: 'DNI',
  CARNET_EXTRANJERIA: 'Carnet de extranjería',
}
