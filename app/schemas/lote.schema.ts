import { z } from 'zod'

const FECHA_REGEX = /^(\d{2}\/\d{4}|\d{2}\/\d{2}\/\d{4})$/

function anioDe(fecha: string): number {
  const partes = fecha.split('/')
  return Number(partes[partes.length - 1])
} 

// Devuelve {anio, mes} de MM/AAAA o DD/MM/AAAA. mes es 1-12.
function anioMesDe(fecha: string): { anio: number; mes: number } {
  const partes = fecha.split('/').map(Number)
  if (partes.length === 2) {
    // MM/AAAA
    return { mes: partes[0]!, anio: partes[1]! }
  }
  // DD/MM/AAAA
  return { mes: partes[1]!, anio: partes[2]! }
}

function esFechaFutura(fecha: string): boolean {
  const { anio, mes } = anioMesDe(fecha)
  const ahora = new Date()
  const anioActual = ahora.getFullYear()
  const mesActual = ahora.getMonth() + 1
  if (anio !== anioActual) return anio > anioActual
  return mes > mesActual
}

export const loteSchema = z
  .object({
    numeroLote: z
      .string({ required_error: 'El número de lote es obligatorio' })
      .min(1, 'El número de lote es obligatorio')
      .max(100),
    fechaFabricacion: z
      .string({ required_error: 'La fecha de fabricación es obligatoria' })
      .min(1, 'La fecha de fabricación es obligatoria')
      .regex(FECHA_REGEX, 'Formato: MM/AAAA o DD/MM/AAAA')
      .refine((f) => !esFechaFutura(f), {
        message: 'La fecha de fabricación no puede ser futura',
      }),
    fechaVencimiento: z
      .string({ required_error: 'La fecha de vencimiento es obligatoria' })
      .min(1, 'La fecha de vencimiento es obligatoria')
      .regex(FECHA_REGEX, 'Formato: MM/AAAA o DD/MM/AAAA'),
    productoId: z
      .number({
        required_error: 'Selecciona un producto',
        invalid_type_error: 'Selecciona un producto',
      })
      .min(1, 'Selecciona un producto'),
    fabricanteId: z
      .number({
        required_error: 'Selecciona un fabricante',
        invalid_type_error: 'Selecciona un fabricante',
      })
      .min(1, 'Selecciona un fabricante'),
  })
  .refine(
    (data) => anioDe(data.fechaVencimiento) >= anioDe(data.fechaFabricacion),
    {
      message: 'El año de vencimiento no puede ser menor al año de fabricación',
      path: ['fechaVencimiento'],
    }
  )

export type LoteFormValues = z.infer<typeof loteSchema>