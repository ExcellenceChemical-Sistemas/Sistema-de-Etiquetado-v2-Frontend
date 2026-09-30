import { z } from 'zod'

// Al crear todavía no existe proforma (KEYFACIL la genera recién cuando Joel cotiza).
// requerimientoEn ya no se pide acá: el backend la fija con la hora real del servidor al crear
// (antes se cargaba a mano, pero eso permitía elegir una fecha más antigua para mejorar el
// indicador — corregirla después de creada es exclusivo de un Admin, ver CotizacionFechaDialog).
export const cotizacionSchema = z.object({
  clienteId: z
    .number({
      required_error: 'Selecciona un cliente',
      invalid_type_error: 'Selecciona un cliente',
    })
    .min(1, 'Selecciona un cliente'),
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
