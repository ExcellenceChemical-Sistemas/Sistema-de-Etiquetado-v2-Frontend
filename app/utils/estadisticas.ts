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

// Años en los que se generó alguna etiqueta, del más reciente al más antiguo
// (para el selector de período del indicador).
export function aniosConEtiquetas(etiquetas: EtiquetaHistorial[] | undefined): number[] {
  const anios = new Set((etiquetas ?? []).map((e) => new Date(e.createdAt).getFullYear()))
  return [...anios].sort((a, b) => b - a)
}

// Etiquetas generadas en un año y/o mes (mes 0-11). null = sin filtrar por ese dato.
export function filtrarPorPeriodo(
  etiquetas: EtiquetaHistorial[] | undefined,
  anio: number | null,
  mes: number | null,
): EtiquetaHistorial[] {
  return (etiquetas ?? []).filter((e) => {
    const f = new Date(e.createdAt)
    return (anio === null || f.getFullYear() === anio) && (mes === null || f.getMonth() === mes)
  })
}

export interface EtiquetasPorProducto {
  nombre: string
  etiquetas: number
}

// Cuántas etiquetas se generaron por producto (las que dieron ERROR no cuentan:
// no salieron impresas), de mayor a menor. Es la señal de qué insumos se piden más.
export function rankingEtiquetasPorProducto(
  etiquetas: EtiquetaHistorial[] | undefined,
): EtiquetasPorProducto[] {
  const porProducto = new Map<string, number>()
  for (const e of etiquetas ?? []) {
    if (e.estado === 'ERROR') continue
    const nombre = e.lote.producto.nombre
    porProducto.set(nombre, (porProducto.get(nombre) ?? 0) + 1)
  }
  return [...porProducto]
    .map(([nombre, etiquetas]) => ({ nombre, etiquetas }))
    .sort((a, b) => b.etiquetas - a.etiquetas || a.nombre.localeCompare(b.nombre))
}
