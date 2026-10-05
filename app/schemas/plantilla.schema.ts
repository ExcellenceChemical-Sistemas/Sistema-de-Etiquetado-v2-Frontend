import { z } from 'zod'

export const plantillaSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(100),
  archivo: z
    .string({ required_error: 'El archivo es obligatorio' })
    .trim()
    .min(1, 'El archivo es obligatorio')
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+\.hbs$/, 'Debe ser un nombre simple terminado en .hbs (sin rutas ni caracteres especiales)'),
  activa: z.boolean().optional(),
})

export type PlantillaFormValues = z.infer<typeof plantillaSchema>
