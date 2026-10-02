import { describe, expect, it } from 'vitest'
import { validarOrdenFechaPedido, validarOrdenFechaCotizacion } from './ordenEtapas'
import type { Pedido } from '~/types/pedido'
import type { Cotizacion } from '~/types/cotizacion'

const PEDIDO_BASE = {
  recibidoEn: '2026-09-01T10:00:00.000Z',
  inicioPreparacionEn: null,
  preparadoEn: null,
  salioEn: null,
  entregadoEn: null,
} as unknown as Pedido

describe('validarOrdenFechaPedido', () => {
  it('una fecha posterior a la etapa previa no rechaza', () => {
    const error = validarOrdenFechaPedido(PEDIDO_BASE, 'preparadoEn', '2026-09-02T10:00:00.000Z')
    expect(error).toBeNull()
  })

  it('una fecha anterior a una etapa ya marcada rechaza con los dos nombres', () => {
    const pedido = { ...PEDIDO_BASE, recibidoEn: '2026-09-02T20:30:00.000Z' } as unknown as Pedido
    const error = validarOrdenFechaPedido(pedido, 'preparadoEn', '2026-09-02T20:00:00.000Z')
    expect(error).toContain('Recibido')
    expect(error).toContain('Preparado')
  })

  it('corregir una etapa intermedia que rompe el orden contra una posterior ya marcada rechaza', () => {
    const pedido = {
      ...PEDIDO_BASE,
      preparadoEn: '2026-09-02T10:00:00.000Z',
      salioEn: '2026-09-03T10:00:00.000Z',
    } as unknown as Pedido
    const error = validarOrdenFechaPedido(pedido, 'preparadoEn', '2026-09-04T10:00:00.000Z')
    expect(error).not.toBeNull()
  })
})

const COTIZACION_BASE = {
  requerimientoEn: '2026-09-01T10:00:00.000Z',
  cotizacionEnviadaEn: null,
  pedidoAprobadoEn: null,
  avisoAlmacenEn: null,
} as unknown as Cotizacion

describe('validarOrdenFechaCotizacion', () => {
  it('una fecha posterior a la etapa previa no rechaza', () => {
    const error = validarOrdenFechaCotizacion(COTIZACION_BASE, 'cotizacionEnviadaEn', '2026-09-02T10:00:00.000Z')
    expect(error).toBeNull()
  })

  it('corregir requerimientoEn a una fecha posterior a una etapa ya marcada rechaza', () => {
    const cotizacion = {
      ...COTIZACION_BASE,
      cotizacionEnviadaEn: '2026-09-02T10:00:00.000Z',
    } as unknown as Cotizacion
    const error = validarOrdenFechaCotizacion(cotizacion, 'requerimientoEn', '2026-09-05T00:00:00.000Z')
    expect(error).not.toBeNull()
  })
})
