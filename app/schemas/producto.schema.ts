import { z } from 'zod'

const nfpaField = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
  z.number().int().min(0, 'Debe ser 0-4').max(4, 'Debe ser 0-4').optional()
)

export const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(150),
  nfpaSalud: nfpaField,
  nfpaInflamabilidad: nfpaField,
  nfpaReactividad: nfpaField,
})

export type ProductoFormValues = z.infer<typeof productoSchema>