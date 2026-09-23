import { z } from 'zod'

export const pedidoSchema = z.object({
  clienteId: z
    .number({
      required_error: 'Selecciona un cliente',
      invalid_type_error: 'Selecciona un cliente',
    })
    .min(1, 'Selecciona un cliente'),
  numeroProforma: z
    .string({ required_error: 'La proforma es obligatoria' })
    .min(1, 'La proforma es obligatoria')
    .max(50),
})

export type PedidoFormValues = z.infer<typeof pedidoSchema>
