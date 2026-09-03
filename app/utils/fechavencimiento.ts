export type EstadoVencimiento = 'vencido' | 'porVencer' | 'vigente'

/** A partir de cuántos días antes del vencimiento se considera "por vencer" */
export const DIAS_POR_VENCER = 365
/**
 * Parsea fechas de vencimiento en formato DD/MM/YYYY o MM/YYYY (mes sin día,
 * se toma el último día de ese mes). Devuelve null si el formato no es válido.
 */
export function parseFechaVencimiento(fecha: string): Date | null {
  const partes = fecha.split('/').map(Number)

  if (partes.length === 3) {
    const [d, m, y] = partes
    if (!d || !m || !y) return null
    return new Date(y, m - 1, d)
  }

  if (partes.length === 2) {
    const [m, y] = partes
    if (!m || !y) return null
    // día 0 del mes siguiente = último día de este mes
    return new Date(y, m, 0)
  }

  return null
}

/**
 * Estado de un lote según su fecha de vencimiento, comparado contra `hoy`
 * (por defecto la fecha actual). Devuelve null si la fecha no se pudo parsear.
 */
export function estadoVencimiento(
  fecha: string,
  hoy: Date = new Date(),
): EstadoVencimiento | null {
  const fechaVenc = parseFechaVencimiento(fecha)
  if (!fechaVenc) return null

  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const diffDias = Math.floor((fechaVenc.getTime() - inicioHoy.getTime()) / 86_400_000)

  if (diffDias < 0) return 'vencido'
  if (diffDias <= DIAS_POR_VENCER) return 'porVencer'
  return 'vigente'
}