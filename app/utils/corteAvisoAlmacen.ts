import { esFeriadoPeru } from './feriadosPeru'

// Joel no avisa a almacén apenas aprueba cada cotización: junta las del día y avisa en un solo
// corte a las 5pm. Corre en el navegador (ya en hora de Perú, a diferencia del backend que corre
// en un servidor de huso horario desconocido), así que acá alcanza con Date local — ver
// corte-aviso-almacen.ts en el backend para el equivalente con aritmética UTC-5 explícita.
const HORA_CORTE = 17 // 5pm

function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getDay() // 0 domingo ... 6 sábado
  if (dia === 0 || dia === 6) return false
  return !esFeriadoPeru(fecha)
}

function corteDelDia(fecha: Date): Date {
  const d = new Date(fecha)
  d.setHours(HORA_CORTE, 0, 0, 0)
  return d
}

// El límite para avisar a almacén una cotización aprobada en `aprobadaEn`: el corte de las 5pm
// del mismo día hábil si se aprobó antes de esa hora en un día hábil; si no (se aprobó después
// de las 5pm, o en fin de semana/feriado), el corte del próximo día hábil.
export function corteLimiteAvisoAlmacen(aprobadaEn: Date | string): Date {
  const instante = new Date(aprobadaEn)
  const cursor = new Date(instante)

  for (let i = 0; i < 14; i++) {
    if (esDiaHabil(cursor)) {
      const corte = corteDelDia(cursor)
      if (corte >= instante) return corte
    }
    cursor.setDate(cursor.getDate() + 1)
    cursor.setHours(12, 0, 0, 0) // solo importa la fecha del próximo día, la hora es un placeholder
  }
  throw new Error('No se encontró un día hábil en los próximos 14 días para calcular el corte de aviso a almacén')
}

// true si se avisó a almacén antes o justo en su corte límite (no hace falta esperar al minuto
// siguiente: avisar exactamente a las 5pm cuenta como cumplido).
export function cumplioCorteAvisoAlmacen(aprobadaEn: Date | string, avisadaEn: Date | string): boolean {
  return new Date(avisadaEn) <= corteLimiteAvisoAlmacen(aprobadaEn)
}
