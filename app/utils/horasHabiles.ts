import { esFeriadoPeru } from './feriadosPeru'

// Horario laboral de la empresa: lunes a viernes, 7:30 a 17:30, sin feriados.
const HORA_INICIO = { horas: 7, minutos: 30 }
const HORA_FIN = { horas: 17, minutos: 30 }

function esDiaLaboral(fecha: Date): boolean {
  const dia = fecha.getDay() // 0 domingo ... 6 sábado
  if (dia === 0 || dia === 6) return false
  return !esFeriadoPeru(fecha)
}

function inicioJornada(fecha: Date): Date {
  const d = new Date(fecha)
  d.setHours(HORA_INICIO.horas, HORA_INICIO.minutos, 0, 0)
  return d
}

function finJornada(fecha: Date): Date {
  const d = new Date(fecha)
  d.setHours(HORA_FIN.horas, HORA_FIN.minutos, 0, 0)
  return d
}

// Los registros se guardan con segundos (hora real del servidor) pero las metas se expresan en
// horas y minutos ("≤ 2h"). Sin truncar, un requerimiento de las 10:15 respondido a las 12:15:40
// daba 2.011h, se mostraba como "2.0" y aun así contaba como fuera de plazo.
function alMinuto(valor: Date | string): Date {
  const d = new Date(valor)
  d.setSeconds(0, 0)
  return d
}

// Horas hábiles entre dos instantes: solo cuenta lunes a viernes, de 7:30 a
// 17:30, sin feriados — así una respuesta que "tardó" de un viernes a la
// tarde a un lunes a la mañana no aparece como 63h de demora en los
// indicadores de Pedidos y Cotizaciones, que es cuando nadie podía responder.
// La precisión es al minuto: los segundos se ignoran en ambos extremos.
export function horasHabilesEntre(inicio: Date | string, fin: Date | string): number {
  const desde = alMinuto(inicio)
  const hasta = alMinuto(fin)
  if (hasta <= desde) return 0

  let horas = 0
  const cursor = new Date(desde)
  cursor.setHours(0, 0, 0, 0)

  while (cursor <= hasta) {
    if (esDiaLaboral(cursor)) {
      const ventanaInicio = inicioJornada(cursor)
      const ventanaFin = finJornada(cursor)
      const desdeEfectivo = desde > ventanaInicio ? desde : ventanaInicio
      const hastaEfectivo = hasta < ventanaFin ? hasta : ventanaFin
      if (hastaEfectivo > desdeEfectivo) {
        horas += (hastaEfectivo.getTime() - desdeEfectivo.getTime()) / 3_600_000
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return horas
}