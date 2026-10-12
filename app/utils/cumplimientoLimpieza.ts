// Cumplimiento mensual del Registro de limpieza.
//
// Regla de negocio:
// - Días a cumplir: lunes a viernes del mes, sin contar feriados nacionales (feriadosPeru.ts).
//   Si el mes es el actual, solo se cuentan los días hasta hoy (inclusive); un mes pasado cuenta
//   completo y un mes futuro no tiene días a cumplir todavía.
// - Día cumplido: tiene al menos un registro cuya respuesta es "SÍ - Se limpiaron TODAS las áreas",
//   ubicado en el día según la columna FECHA (no la "Marca temporal", que es cuándo se envió el form).
//   Un registro en sábado, domingo o feriado no suma ni resta: ese día no era "a cumplir".
import { esFeriadoPeru } from './feriadosPeru'

export type ResultadoCumplimiento = {
  cumplidos: number
  total: number
  /** 0–100, redondeado. Si no hay días a cumplir (mes futuro) es 0. */
  porcentaje: number
}

// Minúsculas, sin tildes, sin emojis y con espacios colapsados: "✅ SÍ - Se limpiaron" y
// "si  - se limpiaron", o el encabezado "📅 FECHA" y "fecha", se comparan igual aunque quien
// arma el Form cambie mayúsculas, tildes o decoración.
export function normalizarTexto(texto: string): string {
  return (texto ?? '')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function indiceColumna(encabezados: string[], nombre: string): number {
  const buscado = normalizarTexto(nombre)
  return encabezados.findIndex((h) => normalizarTexto(h) === buscado)
}

// Debe empezar con "sí": "NO - No se limpiaron todas las áreas" también contiene la frase.
const REGEX_TODAS_LIMPIAS = /^si ?- ?se limpiaron todas las areas/

export function esRegistroCompleto(celda: string): boolean {
  return REGEX_TODAS_LIMPIAS.test(normalizarTexto(celda))
}

export function claveDia(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`
}

// Acepta D/M/AAAA (lo que publica la hoja en es-PE, con o sin hora detrás) y AAAA-MM-DD.
// Devuelve null si no es una fecha real (ej. 31/02/2026).
export function parseFechaRegistro(texto: string): Date | null {
  const t = (texto ?? '').trim()
  let dia: number, mes: number, anio: number

  const dmy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\D.*)?$/)
  const ymd = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\D.*)?$/)
  if (dmy) {
    dia = Number(dmy[1])
    mes = Number(dmy[2])
    anio = Number(dmy[3])
  } else if (ymd) {
    anio = Number(ymd[1])
    mes = Number(ymd[2])
    dia = Number(ymd[3])
  } else {
    return null
  }

  const fecha = new Date(anio, mes - 1, dia)
  const valida = fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia
  return valida ? fecha : null
}

// Claves "AAAA-MM-DD" de los días a cumplir de un mes (mes0 = 0–11).
export function diasACumplir(anio: number, mes0: number, hoy: Date): string[] {
  const hoyLimpio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const ultimoDia = new Date(anio, mes0 + 1, 0).getDate()
  const dias: string[] = []

  for (let d = 1; d <= ultimoDia; d++) {
    const fecha = new Date(anio, mes0, d)
    if (fecha > hoyLimpio) break
    const diaSemana = fecha.getDay() // 0 domingo, 6 sábado
    if (diaSemana === 0 || diaSemana === 6) continue
    if (esFeriadoPeru(fecha)) continue
    dias.push(claveDia(fecha))
  }
  return dias
}

export function calcularCumplimiento(
  encabezados: string[],
  filas: string[][],
  anio: number,
  mes0: number,
  hoy: Date = new Date(),
): ResultadoCumplimiento {
  const aCumplir = diasACumplir(anio, mes0, hoy)
  const colFecha = indiceColumna(encabezados, 'FECHA')

  const diasConRegistro = new Set<string>()
  if (colFecha !== -1) {
    for (const fila of filas) {
      const fecha = parseFechaRegistro(fila[colFecha] ?? '')
      if (!fecha) continue
      // la respuesta "SÍ - Se limpiaron TODAS…" puede estar en cualquier columna: se busca en la fila
      // (sin contar la fecha) para no depender del texto exacto del encabezado de esa pregunta
      const completo = fila.some((celda, i) => i !== colFecha && esRegistroCompleto(celda))
      if (completo) diasConRegistro.add(claveDia(fecha))
    }
  }

  const cumplidos = aCumplir.filter((d) => diasConRegistro.has(d)).length
  const total = aCumplir.length
  return { cumplidos, total, porcentaje: total === 0 ? 0 : Math.round((cumplidos / total) * 100) }
}

// Meses ("AAAA-MM") con al menos un registro, más el mes actual, del más reciente al más antiguo.
export function mesesDisponibles(encabezados: string[], filas: string[][], hoy: Date = new Date()): string[] {
  const colFecha = indiceColumna(encabezados, 'FECHA')
  const meses = new Set<string>([claveDia(hoy).slice(0, 7)])
  if (colFecha !== -1) {
    for (const fila of filas) {
      const fecha = parseFechaRegistro(fila[colFecha] ?? '')
      if (fecha) meses.add(claveDia(fecha).slice(0, 7))
    }
  }
  return [...meses].sort().reverse()
}