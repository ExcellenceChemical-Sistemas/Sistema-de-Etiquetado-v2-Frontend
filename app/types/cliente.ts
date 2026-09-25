export type TipoDocumentoCliente = 'RUC' | 'DNI' | 'CARNET_EXTRANJERIA'

export interface Cliente {
  id: number
  nombre: string
  nombreNormalizado: string
  tipoDocumento: TipoDocumentoCliente | null
  numeroDocumento: string | null
  direccion: string | null
  celular: string | null
  // Correo para los avisos del pedido (salió / entregado). Opcional.
  email: string | null
  // Fecha en que el personal registró que el cliente fue informado y autorizó el uso de sus
  // datos de contacto. Null = sin registro (p. ej. clientes cargados antes de este campo).
  autorizaContactoEn: string | null
  createdAt: string
}

export interface ClienteInput {
  nombre: string
  tipoDocumento?: TipoDocumentoCliente
  numeroDocumento?: string
  direccion?: string
  celular?: string
  email?: string
  // Confirmación del personal; el backend guarda la fecha en `autorizaContactoEn`.
  autorizaContacto?: boolean
}

export type ActualizarClienteInput = Partial<ClienteInput>

export const TIPOS_DOCUMENTO_CLIENTE: TipoDocumentoCliente[] = ['RUC', 'DNI', 'CARNET_EXTRANJERIA']

export const TIPO_DOCUMENTO_CLIENTE_LABEL: Record<TipoDocumentoCliente, string> = {
  RUC: 'RUC',
  DNI: 'DNI',
  CARNET_EXTRANJERIA: 'Carnet de extranjería',
}
