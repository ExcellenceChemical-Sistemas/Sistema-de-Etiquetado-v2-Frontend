import { z } from 'zod'
import { TIPOS_DOCUMENTO_CLIENTE } from '~/types/cliente'

export const clienteSchema = z
  .object({
    nombre: z
      .string({ required_error: 'El nombre es obligatorio' })
      .min(1, 'El nombre es obligatorio')
      .max(200),
    tipoDocumento: z.enum(TIPOS_DOCUMENTO_CLIENTE as [string, ...string[]]).optional(),
    numeroDocumento: z.string().max(30).optional().or(z.literal('')),
    direccion: z.string().max(300).optional().or(z.literal('')),
    celular: z.string().max(30).optional().or(z.literal('')),
    email: z.string().trim().email('Ingresa un correo válido').max(254).optional().or(z.literal('')),
    autorizaContacto: z.boolean().optional(),
  })
  // Solo se guardan datos de contacto con el conocimiento y la autorización del cliente.
  .superRefine((v, ctx) => {
    if ((v.celular?.trim() || v.email?.trim()) && !v.autorizaContacto) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['autorizaContacto'],
        message: 'Confirma que informaste al cliente y que autoriza el uso de sus datos de contacto',
      })
    }
  })

export type ClienteFormValues = z.infer<typeof clienteSchema>
