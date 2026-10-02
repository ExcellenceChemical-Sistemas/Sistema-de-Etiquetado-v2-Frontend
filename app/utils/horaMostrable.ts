// A partir de las 5:30pm almacén ya cerró el día operativo (ver corteAvisoAlmacen.ts). Una hora
// real registrada después de esa hora (ej. una entrega tardía, o un pedido notificado ya cerrando
// el día) se muestra tapada a las 5:30pm en pantalla — a pedido explícito del negocio, para que
// ninguna hora posterior a las 5:30pm quede visible en los reportes. El dato real nunca se toca:
// esto es puramente de presentación, se aplica justo antes de formatear con formatFechaHora.
const HORA_CORTE = 17
const MINUTO_CORTE = 30

export function horaMostrable<T extends string | null | undefined>(fecha: T): T {
  if (!fecha) return fecha
  const d = new Date(fecha)
  if (d.getHours() > HORA_CORTE || (d.getHours() === HORA_CORTE && d.getMinutes() > MINUTO_CORTE)) {
    const tapada = new Date(d)
    tapada.setHours(HORA_CORTE, MINUTO_CORTE, 0, 0)
    return tapada.toISOString() as T
  }
  return fecha
}
