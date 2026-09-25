import { describe, expect, it } from 'vitest'
import { construirLineaTiempo, urlSeguimiento, type PedidoPublicoFechas } from './seguimientoPedido'

const F = '2026-09-01T10:00:00.000Z'
const base: PedidoPublicoFechas = {
  recibidoEn: F,
  inicioPreparacionEn: null,
  preparadoEn: null,
  salioEn: null,
  entregadoEn: null,
  estado: 'RECIBIDO',
}
const situaciones = (p: PedidoPublicoFechas) => construirLineaTiempo(p).map((e) => e.situacion)

describe('construirLineaTiempo', () => {
  it('siempre muestra las 5 etapas en orden', () => {
    expect(construirLineaTiempo(base).map((e) => e.estado)).toEqual([
      'RECIBIDO',
      'EN_PREPARACION',
      'PREPARADO',
      'SALIO',
      'ENTREGADO',
    ])
  })

  it('recién recibido: la primera etapa está en curso y el resto pendiente', () => {
    expect(situaciones(base)).toEqual(['actual', 'pendiente', 'pendiente', 'pendiente', 'pendiente'])
  })

  it('en camino: lo anterior queda hecho, "En camino" en curso y falta la entrega', () => {
    const p = { ...base, inicioPreparacionEn: F, preparadoEn: F, salioEn: F, estado: 'SALIO' as const }
    expect(situaciones(p)).toEqual(['hecha', 'hecha', 'hecha', 'actual', 'pendiente'])
  })

  it('entregado: todo queda hecho, nada "en curso"', () => {
    const p = {
      ...base,
      inicioPreparacionEn: F,
      preparadoEn: F,
      salioEn: F,
      entregadoEn: F,
      estado: 'ENTREGADO' as const,
    }
    expect(situaciones(p)).toEqual(['hecha', 'hecha', 'hecha', 'hecha', 'hecha'])
  })

  it('si se cargó una etapa sin las anteriores, las anteriores cuentan como hechas (sin fecha)', () => {
    const t = construirLineaTiempo({ ...base, salioEn: F, estado: 'SALIO' })
    expect(t.map((e) => e.situacion)).toEqual(['hecha', 'hecha', 'hecha', 'actual', 'pendiente'])
    expect(t[1]!.fecha).toBeNull()
    expect(t[3]!.fecha).toBe(F)
  })

  it('lleva la fecha de cada etapa que la tiene', () => {
    const t = construirLineaTiempo({ ...base, inicioPreparacionEn: F, estado: 'EN_PREPARACION' })
    expect(t[0]!.fecha).toBe(F)
    expect(t[1]!.fecha).toBe(F)
    expect(t[2]!.fecha).toBeNull()
  })
})

describe('urlSeguimiento', () => {
  it('arma /p/<token> sobre el origen de la app', () => {
    expect(urlSeguimiento('https://excellencechemical.vercel.app', 'abc123')).toBe(
      'https://excellencechemical.vercel.app/p/abc123',
    )
  })

  it('tolera una barra final en el origen y escapa el token', () => {
    expect(urlSeguimiento('https://x.com/', 'a b')).toBe('https://x.com/p/a%20b')
  })
})
