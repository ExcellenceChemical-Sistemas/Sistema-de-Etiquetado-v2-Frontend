import { z } from 'zod'

// Al crear todavía no existe proforma (KEYFACIL la genera recién cuando Joel cotiza).
// requerimientoEn es obligatorio y se carga a mano: es la fecha/hora del SMS o chat en el que el
// cliente pidió la cotización, no necesariamente "ahora" (Joel suele cargarlo después).
export const cotizacionSchema = z.object({
  clienteId: z
    .number({
      required_error: 'Selecciona un cliente',
      invalid_type_error: 'Selecciona un cliente',
    })
    .min(1, 'Selecciona un cliente'),
  requerimientoEn: z
    .string({ required_error: 'La fecha y hora de requerimiento son obligatorias' })
    .min(1, 'La fecha y hora de requerimiento son obligatorias'),
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
