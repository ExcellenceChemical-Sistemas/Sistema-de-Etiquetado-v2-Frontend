import { z } from 'zod'

export const fabricanteSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(120, 'El nombre es demasiado largo'),
})

export type FabricanteFormValues = z.infer<typeof fabricanteSchema>