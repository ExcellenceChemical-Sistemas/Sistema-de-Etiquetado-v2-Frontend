import { describe, it, expect } from 'vitest'
import type { EtiquetaHistorial } from '~/composables/useHistorialEtiquetas'
import { aniosConEtiquetas, etiquetasPorMes, filtrarPorPeriodo, rankingEtiquetasPorProducto } from './estadisticas'

function etiqueta(producto: string, createdAt: string, estado: EtiquetaHistorial['estado'] = 'IMPRESO') {
  return { estado, createdAt, lote: { producto: { nombre: producto } } } as EtiquetaHistorial
}

const lista = [
  etiqueta('Soda cáustica', '2026-03-10T15:00:00'),
  etiqueta('Soda cáustica', '2026-03-20T15:00:00'),
  etiqueta('Ácido nítrico', '2026-03-21T15:00:00'),
  etiqueta('Ácido nítrico', '2026-04-02T15:00:00'),
  etiqueta('Ácido nítrico', '2025-03-02T15:00:00', 'ERROR'),
]

describe('estadísticas de etiquetas', () => {
  it('lista los años con etiquetas, del más reciente al más antiguo', () => {
    expect(aniosConEtiquetas(lista)).toEqual([2026, 2025])
    expect(aniosConEtiquetas(undefined)).toEqual([])
  })

  it('filtra por año y mes (0-11), y null no filtra', () => {
    expect(filtrarPorPeriodo(lista, 2026, 2)).toHaveLength(3)
    expect(filtrarPorPeriodo(lista, 2026, null)).toHaveLength(4)
    expect(filtrarPorPeriodo(lista, null, 2)).toHaveLength(4)
    expect(filtrarPorPeriodo(lista, null, null)).toHaveLength(5)
  })

  it('rankea productos por etiquetas y no cuenta las que dieron error', () => {
    // empate en 2: desempata por nombre
    expect(rankingEtiquetasPorProducto(lista)).toEqual([
      { nombre: 'Ácido nítrico', etiquetas: 2 },
      { nombre: 'Soda cáustica', etiquetas: 2 },
    ])
    expect(rankingEtiquetasPorProducto(filtrarPorPeriodo(lista, 2026, 2))[0]).toEqual({
      nombre: 'Soda cáustica',
      etiquetas: 2,
    })
  })

  it('arma la serie mensual: 12 meses del año elegido, o los últimos 12 con datos', () => {
    const delAnio = etiquetasPorMes(lista, 2026)
    expect(delAnio).toHaveLength(12)
    expect(delAnio[2]!.etiquetas).toBe(3) // marzo
    expect(delAnio[3]!.etiquetas).toBe(1) // abril

    const ultimos = etiquetasPorMes(lista, null)
    expect(ultimos).toHaveLength(12)
    expect(ultimos[11]!).toMatchObject({ anio: 2026, mes: 3, etiquetas: 1 }) // termina en abril 2026
    expect(ultimos[10]!).toMatchObject({ anio: 2026, mes: 2, etiquetas: 3 })
    expect(etiquetasPorMes(undefined, 2026).every((m) => m.etiquetas === 0)).toBe(true)
  })
})
