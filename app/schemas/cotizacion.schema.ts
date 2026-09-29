import { z } from 'zod'

export const cotizacionSchema = z.object({
  clienteId: z
    .number({
      required_error: 'Selecciona un cliente',
      invalid_type_error: 'Selecciona un cliente',
    })
    .min(1, 'Selecciona un cliente'),
  numeroProforma: z
    .string({ required_error: 'La proforma de KEYFACIL es obligatoria' })
    .min(1, 'La proforma de KEYFACIL es obligatoria')
    .max(50),
  notas: z.string().max(1000).optional(),
})

export type CotizacionFormValues = z.infer<typeof cotizacionSchema>
