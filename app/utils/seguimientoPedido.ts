// Lógica pura de la página pública de seguimiento de un pedido (/p/<token>).
// Va aparte de la página para poder probarla sin arrancar Nuxt.

import type { EstadoPedido } from '~/types/pedido'

export interface PedidoPublicoFechas {
  recibidoEn: string
  inicioPreparacionEn: string | null
  preparadoEn: string | null
  salioEn: string | null
  entregadoEn: string | null
  estado: EstadoPedido
  // true cuando el pedido es de recojo en almacén (no se le hace entrega). La línea de
  // tiempo pública se salta el paso "En camino" en ese caso, porque no aplica.
  recojeEnAlmacen: boolean
}

export type SituacionEtapa = 'hecha' | 'actual' | 'pendiente'

export interface EtapaSeguimiento {
  estado: EstadoPedido
  titulo: string
  descripcion: string
  fecha: string | null
  situacion: SituacionEtapa
}

// Lo que ve el cliente: frases pensadas para quien no conoce el almacén.
const ETAPAS: {
  estado: EstadoPedido
  titulo: string
  descripcion: string
  campo: 'recibidoEn' | 'inicioPreparacionEn' | 'preparadoEn' | 'salioEn' | 'entregadoEn'
}[] = [
  { estado: 'RECIBIDO', titulo: 'Pedido recibido', descripcion: 'Recibimos tu pedido.', campo: 'recibidoEn' },
  { estado: 'EN_PREPARACION', titulo: 'En preparación', descripcion: 'Estamos preparando tus productos.', campo: 'inicioPreparacionEn' },
  { estado: 'PREPARADO', titulo: 'Pedido listo', descripcion: 'Tu pedido está listo.', campo: 'preparadoEn' },
  { estado: 'SALIO', titulo: 'En camino', descripcion: 'Tu pedido salió de nuestro almacén.', campo: 'salioEn' },
  { estado: 'ENTREGADO', titulo: 'Entregado', descripcion: 'Tu pedido fue entregado.', campo: 'entregadoEn' },
]

const ORDEN: EstadoPedido[] = ETAPAS.map((e) => e.estado)

/**
 * Línea de tiempo del pedido. El estado lo decide el backend (la etapa más avanzada
 * gana, aunque falten fechas de las anteriores porque se cargan a mano), así que acá
 * todo lo que está hasta esa etapa cuenta como hecho, tenga fecha o no.
 *
 * Si el pedido es de recojo en almacén, el paso "En camino" (SALIO) no aplica —
 * nadie lo "envía" a ningún lado, el cliente lo recoge directo del almacén — así que
 * se omite de la lista. La comparación de "hecha"/"actual" sigue usando el índice
 * dentro de las 5 etapas originales, para que no se descuadre si el pedido igual
 * llegara a tener `salioEn` seteado (ej. una corrección manual).
 */
export function construirLineaTiempo(p: PedidoPublicoFechas): EtapaSeguimiento[] {
  const indiceActual = ORDEN.indexOf(p.estado)
  return ETAPAS.filter((e) => !(p.recojeEnAlmacen && e.estado === 'SALIO')).map((e) => {
    const i = ORDEN.indexOf(e.estado)
    let situacion: SituacionEtapa = 'pendiente'
    // Entregado es el final: no queda nada "en curso", queda hecho.
    if (i < indiceActual || (i === indiceActual && e.estado === 'ENTREGADO')) situacion = 'hecha'
    else if (i === indiceActual) situacion = 'actual'
    return { estado: e.estado, titulo: e.titulo, descripcion: e.descripcion, fecha: p[e.campo] ?? null, situacion }
  })
}

/** Enlace que se le manda al cliente. `origen` es donde se sirve esta app (window.location.origin). */
export function urlSeguimiento(origen: string, token: string): string {
  return `${origen.replace(/\/+$/, '')}/p/${encodeURIComponent(token)}`
}
