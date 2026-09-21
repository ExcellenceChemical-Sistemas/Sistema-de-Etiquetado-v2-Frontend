import { z } from 'zod'

const nfpaField = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
  z.number().int().min(0, 'Debe ser 0-4').max(4, 'Debe ser 0-4').optional()
)

// g/ml; acepta coma decimal. Vacío = sin densidad (no se calcula tara de líquidos).
const densidadField = z.preprocess(
  (val) => {
    if (val === '' || val === null || val === undefined) return undefined
    return Number(String(val).replace(',', '.'))
  },
  z.number({ invalid_type_error: 'Ingresa un número' }).positive('Debe ser mayor a 0').max(30, 'Valor demasiado alto').optional()
)

export const productoSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(1, 'El nombre es obligatorio')
    .max(150),
  nfpaSalud: nfpaField,
  nfpaInflamabilidad: nfpaField,
  nfpaReactividad: nfpaField,
  densidad: densidadField,
  pictogramasGhs: z.array(z.string()).optional(),
  palabraAdvertencia: z.enum(['PELIGRO', 'ATENCION']).optional().nullable(),
  frasesH: z.array(z.string()).optional(),
  frasesP: z.array(z.string()).optional(),
})

export type ProductoFormValues = z.infer<typeof productoSchema>