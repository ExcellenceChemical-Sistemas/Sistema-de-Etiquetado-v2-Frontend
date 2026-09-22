import type { EtiquetaHistorial } from '~/composables/useHistorialEtiquetas'

// Total de escaneos por producto, sumando todas sus etiquetas (cada una con su propio QR).
export function agruparEscaneosPorProducto(
  etiquetas: EtiquetaHistorial[] | undefined,
): { nombre: string; escaneos: number }[] {
  const porProducto = new Map<string, number>()
  for (const e of etiquetas ?? []) {
    if (!e.escaneos) continue
    const nombre = e.lote.producto.nombre
    porProducto.set(nombre, (porProducto.get(nombre) ?? 0) + e.escaneos)
  }
  return [...porProducto.entries()].map(([nombre, escaneos]) => ({ nombre, escaneos }))
}
