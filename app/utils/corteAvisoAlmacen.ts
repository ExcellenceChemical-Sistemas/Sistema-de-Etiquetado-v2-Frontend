import { esFeriadoPeru } from './feriadosPeru'

// Joel no avisa a almacén apenas aprueba cada cotización: junta las del día y las despacha en un
// solo corte, que en la práctica cierra entre las 5pm y las 5:30pm (no a las 5pm en punto — con
// ese límite más estricto, una cotización avisada a las 5:15pm, dentro de su ventana normal de
// trabajo, aparecía como "atrasada"). Corre en el navegador (ya en hora de Perú, a diferencia del
// backend que corre en un servidor de huso horario desconocido), así que acá alcanza con Date
// local — ver corte-aviso-almacen.ts en el backend para el equivalente con aritmética UTC-5
// explícita (debe quedar con el mismo horario de corte que acá).
const HORA_CORTE = 17 // 5pm
const MINUTO_CORTE = 30 // el corte cierra a las 5:30pm, no a las 5pm en punto — ver nota arriba

function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getDay() // 0 domingo ... 6 sábado
  if (dia === 0 || dia === 6) return false
  return !esFeriadoPeru(fecha)
}

function corteDelDia(fecha: Date): Date {
  const d = new Date(fecha)
  d.setHours(HORA_CORTE, MINUTO_CORTE, 0, 0)
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

// true si se avisó a almacén antes o durante el minuto de su corte límite. Se ignoran los
// segundos a propósito: la hora de aviso se guarda con segundos (hora real del servidor) pero
// el corte se expresa en minutos ("5:30pm"), así que avisar a las 5:30:14 cuenta como cumplido.
// Sin esto, todo aviso hecho durante el minuto 5:30 aparecía "fuera de plazo" con 0.0 h de atraso.
export function cumplioCorteAvisoAlmacen(aprobadaEn: Date | string, avisadaEn: Date | string): boolean {
  const avisada = new Date(avisadaEn)
  avisada.setSeconds(0, 0)
  return avisada <= corteLimiteAvisoAlmacen(aprobadaEn)
}
