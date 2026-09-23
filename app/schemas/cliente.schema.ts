import { z } from 'zod'
import { TIPOS_DOCUMENTO_CLIENTE } from '~/types/cliente'

export const clienteSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(1, 'El nombre es obligatorio')
    .max(200),
  tipoDocumento: z.enum(TIPOS_DOCUMENTO_CLIENTE as [string, ...string[]]).optional(),
  numeroDocumento: z.string().max(30).optional().or(z.literal('')),
  direccion: z.string().max(300).optional().or(z.literal('')),
  celular: z.string().max(30).optional().or(z.literal('')),
})

export type ClienteFormValues = z.infer<typeof clienteSchema>
