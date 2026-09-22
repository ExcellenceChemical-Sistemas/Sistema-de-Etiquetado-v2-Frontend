import type { EtiquetaHistorial } from '~/composables/useHistorialEtiquetas'

export interface ResumenProducto {
  nombre: string
  escaneos: number
  coaVistas: number
  coaDescargas: number
  fdsVistas: number
}

// Fila por producto, sumando todas sus etiquetas (cada una con su propio QR).
// Se excluyen los productos sin ninguna actividad para no llenar la tabla de ceros.
export function agruparEstadisticasPorProducto(
  etiquetas: EtiquetaHistorial[] | undefined,
): ResumenProducto[] {
  const porProducto = new Map<string, ResumenProducto>()
  for (const e of etiquetas ?? []) {
    if (!e.escaneos && !e.coaVistas && !e.coaDescargas && !e.fdsVistas) continue
    const nombre = e.lote.producto.nombre
    const actual = porProducto.get(nombre) ?? {
      nombre,
      escaneos: 0,
      coaVistas: 0,
      coaDescargas: 0,
      fdsVistas: 0,
    }
    actual.escaneos += e.escaneos
    actual.coaVistas += e.coaVistas
    actual.coaDescargas += e.coaDescargas
    actual.fdsVistas += e.fdsVistas
    porProducto.set(nombre, actual)
  }
  return [...porProducto.values()].sort((a, b) => b.escaneos - a.escaneos)
}

export interface TotalesEstadisticas {
  escaneos: number
  coaVistas: number
  coaDescargas: number
  fdsVistas: number
}

// Totales globales, para las tarjetas de resumen arriba de la tabla/gráfico.
export function totalesEstadisticas(etiquetas: EtiquetaHistorial[] | undefined): TotalesEstadisticas {
  return (etiquetas ?? []).reduce(
    (acc, e) => {
      acc.escaneos += e.escaneos
      acc.coaVistas += e.coaVistas
      acc.coaDescargas += e.coaDescargas
      acc.fdsVistas += e.fdsVistas
      return acc
    },
    { escaneos: 0, coaVistas: 0, coaDescargas: 0, fdsVistas: 0 },
  )
}
