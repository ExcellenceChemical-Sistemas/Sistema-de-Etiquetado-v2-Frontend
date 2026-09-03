import { z } from "zod";

const numeroTexto = /^\d+([.,]\d+)?$/;

// El usuario solo tipea el número de proforma; el prefijo "PF01-" lo arma
// el frontend antes de enviar. El DTO del backend acepta el string completo
// (máx 50 chars), por eso acá se deja margen: 50 - "PF01-".length(5) = 45.
//
// Hay dos modos (proformaModo):
// - "numero": arma "PF01-<número>". Si el número queda vacío, se manda solo
//   "PF01-" (satisface el @IsNotEmpty() del backend).
// - "blanco": para muestras que no llevan proforma. Se manda un espacio en
//   blanco (' ') — pasa la validación del backend pero no se ve NADA de
//   proforma en la etiqueta impresa (ni número ni "PF01-").
export const generarEtiquetaSchema = z.object({
  loteId: z
    .number({
      required_error: "Selecciona un lote",
      invalid_type_error: "Selecciona un lote",
    })
    .min(1, "Selecciona un lote"),

  proformaModo: z.enum(["numero", "blanco"], {
    required_error: "Selecciona una opción",
    invalid_type_error: "Selecciona una opción",
  }),
  proformaNumero: z
    .string()
    .max(45, "Máximo 45 caracteres")
    .regex(/^[A-Za-z0-9-]*$/, "Solo letras, números y guiones")
    .optional()
    .default(""),

  pesoBruto: z
    .string({ required_error: "El peso bruto es obligatorio" })
    .min(1, "El peso bruto es obligatorio")
    .regex(numeroTexto, "Formato inválido (ej. 1.140)"),
  unidadBruto: z.enum(["KG", "GR"], {
    required_error: "Selecciona la unidad",
    invalid_type_error: "Selecciona la unidad",
  }),

  cantidadNeta: z
    .string()
    .regex(numeroTexto, "Formato inválido (ej. 1.140)")
    .optional()
    .or(z.literal("")),
  unidadNeta: z.enum(["KG", "GR", "ML", "L"], {
    required_error: "Selecciona la unidad",
    invalid_type_error: "Selecciona la unidad",
  }),

  // Cantidad de copias físicas a imprimir. No es un campo del DTO del
  // backend: el frontend llama al endpoint una vez por cada copia, porque
  // cada request ya imprime una etiqueta física (ver EtiquetasService.generar).
  cantidad: z
    .number({
      required_error: "Ingresa la cantidad de copias",
      invalid_type_error: "Ingresa un número",
    })
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1 copia")
    .max(50, "Máximo 50 copias por tanda"),

  plantillaId: z
    .number({
      required_error: "Selecciona una plantilla",
      invalid_type_error: "Selecciona una plantilla",
    })
    .min(1, "Selecciona una plantilla"),
});

export type GenerarEtiquetaFormValues = z.infer<typeof generarEtiquetaSchema>;