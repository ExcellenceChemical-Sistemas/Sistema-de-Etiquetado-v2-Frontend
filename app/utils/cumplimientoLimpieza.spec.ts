import { describe, it, expect } from 'vitest'
import {
  calcularCumplimiento,
  diasACumplir,
  esRegistroCompleto,
  mesesDisponibles,
  parseFechaRegistro,
} from './cumplimientoLimpieza'

const ENCABEZADOS = ['Marca temporal', 'FECHA', 'RESPONSABLE', '¿Se limpiaron las áreas?']
const SI = 'SÍ - Se limpiaron TODAS las áreas'
const NO = 'NO - No se limpiaron todas las áreas'

// fila de la hoja: la marca temporal es de otro día a propósito (la que manda es FECHA)
const fila = (fecha: string, respuesta: string) => ['01/01/2030 08:00:00', fecha, 'Ana', respuesta]

describe('esRegistroCompleto', () => {
  it('reconoce el SÍ aunque cambien mayúsculas, tildes o espacios', () => {
    expect(esRegistroCompleto(SI)).toBe(true)
    expect(esRegistroCompleto('si - se limpiaron todas las areas')).toBe(true)
    expect(esRegistroCompleto('  SÍ  -  Se limpiaron TODAS las áreas ')).toBe(true)
  })

  it('ignora los emojis que trae la hoja real (✅ SÍ - …)', () => {
    expect(esRegistroCompleto('✅ SÍ - Se limpiaron TODAS las áreas')).toBe(true)
    expect(esRegistroCompleto('❌ NO - No se limpiaron todas las áreas')).toBe(false)
  })

  it('un NO que contiene la misma frase no cuenta', () => {
    expect(esRegistroCompleto(NO)).toBe(false)
    expect(esRegistroCompleto('SÍ - Se limpiaron algunas áreas')).toBe(false)
    expect(esRegistroCompleto('')).toBe(false)
  })
})

describe('parseFechaRegistro', () => {
  it('lee D/M/AAAA, con o sin hora, y AAAA-MM-DD', () => {
    expect(parseFechaRegistro('9/10/2026')).toEqual(new Date(2026, 9, 9))
    expect(parseFechaRegistro('09/10/2026')).toEqual(new Date(2026, 9, 9))
    expect(parseFechaRegistro('09/10/2026 8:30:00')).toEqual(new Date(2026, 9, 9))
    expect(parseFechaRegistro('2026-10-09')).toEqual(new Date(2026, 9, 9))
  })

  it('devuelve null con basura o fechas imposibles', () => {
    expect(parseFechaRegistro('')).toBeNull()
    expect(parseFechaRegistro('ayer')).toBeNull()
    expect(parseFechaRegistro('31/02/2026')).toBeNull()
  })
})

describe('diasACumplir', () => {
  it('octubre 2026 al 09/10: jueves 1, viernes 2, 5, 6, 7 y viernes 9 (el 8 es feriado)', () => {
    expect(diasACumplir(2026, 9, new Date(2026, 9, 9))).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-09',
    ])
  })

  it('un mes pasado cuenta completo y no incluye fines de semana ni feriados', () => {
    // septiembre 2026: 22 días de lunes a viernes, sin feriados
    expect(diasACumplir(2026, 8, new Date(2026, 9, 12))).toHaveLength(22)
  })

  it('un mes futuro no tiene días a cumplir', () => {
    expect(diasACumplir(2026, 10, new Date(2026, 9, 12))).toEqual([])
  })

  it('descuenta Jueves y Viernes Santo (abril 2026: 22 laborables − 2)', () => {
    expect(diasACumplir(2026, 3, new Date(2026, 4, 1))).toHaveLength(20)
  })
})

describe('calcularCumplimiento con el formato real de la hoja', () => {
  it('encabezado "📅 FECHA", respuesta con ✅ y fila de feriado escrita a mano: octubre al 12/10 → 7 de 7', () => {
    const enc = ['Marca temporal', '📅 FECHA', '1. ¿Se limpió TODO correctamente?']
    const ok = '✅ SÍ - Se limpiaron TODAS las áreas'
    const filas = [
      ['6/10/2026 11:56:26', '1/10/2026', ok],
      ['6/10/2026 12:21:44', '2/10/2026', ok],
      ['6/10/2026 12:24:54', '5/10/2026', ok],
      ['7/10/2026 7:43:50', '6/10/2026', ok],
      ['7/10/2026 12:32:33', '7/10/2026', ok],
      ['', '🚨 (8-10)FERIADO', '- COMBATE'],
      ['12/10/2026 8:17:47', '9/10/2026', ok],
      ['12/10/2026 12:46:57', '12/10/2026', ok],
    ]
    expect(calcularCumplimiento(enc, filas, 2026, 9, new Date(2026, 9, 12))).toEqual({
      cumplidos: 7,
      total: 7,
      porcentaje: 100,
    })
  })
})

describe('calcularCumplimiento', () => {
  const hoy = new Date(2026, 9, 9)

  it('ejemplo del pedido: octubre al 09/10 → 6 de 6 (100%)', () => {
    const filas = ['1/10/2026', '2/10/2026', '5/10/2026', '6/10/2026', '7/10/2026', '9/10/2026'].map((f) =>
      fila(f, SI),
    )
    expect(calcularCumplimiento(ENCABEZADOS, filas, 2026, 9, hoy)).toEqual({ cumplidos: 6, total: 6, porcentaje: 100 })
  })

  it('cuenta por FECHA, no por la marca temporal, y solo registros SÍ', () => {
    const filas = [fila('1/10/2026', SI), fila('2/10/2026', NO), fila('5/10/2026', SI)]
    expect(calcularCumplimiento(ENCABEZADOS, filas, 2026, 9, hoy)).toEqual({ cumplidos: 2, total: 6, porcentaje: 33 })
  })

  it('varios registros el mismo día cuentan como un solo día', () => {
    const filas = [fila('1/10/2026', SI), fila('1/10/2026', SI)]
    expect(calcularCumplimiento(ENCABEZADOS, filas, 2026, 9, hoy).cumplidos).toBe(1)
  })

  it('un día con un NO y un SÍ cuenta como cumplido', () => {
    const filas = [fila('1/10/2026', NO), fila('1/10/2026', SI)]
    expect(calcularCumplimiento(ENCABEZADOS, filas, 2026, 9, hoy).cumplidos).toBe(1)
  })

  it('un registro en fin de semana o feriado no suma', () => {
    const filas = [fila('3/10/2026', SI), fila('8/10/2026', SI)] // sábado y feriado (Angamos)
    expect(calcularCumplimiento(ENCABEZADOS, filas, 2026, 9, hoy).cumplidos).toBe(0)
  })

  it('un registro de otro mes no entra en el mes consultado', () => {
    const filas = [fila('30/09/2026', SI)]
    expect(calcularCumplimiento(ENCABEZADOS, filas, 2026, 9, hoy).cumplidos).toBe(0)
  })

  it('sin columna FECHA o mes futuro no rompe: 0 y sin dividir entre 0', () => {
    expect(calcularCumplimiento(['A', 'B'], [['x', 'y']], 2026, 9, hoy).cumplidos).toBe(0)
    expect(calcularCumplimiento(ENCABEZADOS, [], 2026, 10, hoy)).toEqual({ cumplidos: 0, total: 0, porcentaje: 0 })
  })
})

describe('mesesDisponibles', () => {
  it('junta los meses con registros y el actual, del más nuevo al más viejo', () => {
    const filas = [fila('15/08/2026', SI), fila('2/09/2026', SI), fila('basura', SI)]
    expect(mesesDisponibles(ENCABEZADOS, filas, new Date(2026, 9, 12))).toEqual(['2026-10', '2026-09', '2026-08'])
  })
})