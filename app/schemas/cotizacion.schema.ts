import { z } from 'zod'

// Al crear todavía no existe proforma (KEYFACIL la genera recién cuando Joel cotiza).
// requerimientoEn es de carga libre: precargada con la hora actual (ver CotizacionForm.vue), pero
// editable — es la fecha/hora en que el cliente pide el producto, no algo que el sistema pueda
// saber solo. A diferencia de las otras 3 fechas, no hace falta ser Admin para cambiarla después.
export const cotizacionSchema = z.object({
  clienteId: z
    .number({
      required_error: 'Selecciona un cliente',
      invalid_type_error: 'Selecciona un cliente',
    })
    .min(1, 'Selecciona un cliente'),
  requerimientoEn: z.string().min(1, 'Ingresa la fecha y hora de requerimiento'),
  notas: z.string().max(1000).optional(),
})

export type CotizacionFormValues = z.infer<typeof cotizacionSchema>

export const cotizacionEnviarSchema = z.object({
  numeroProforma: z
    .string({ required_error: 'La proforma de KEYFACIL es obligatoria' })
    .min(1, 'La proforma de KEYFACIL es obligatoria')
    .max(50),
})

export type CotizacionEnviarFormValues = z.infer<typeof cotizacionEnviarSchema>
