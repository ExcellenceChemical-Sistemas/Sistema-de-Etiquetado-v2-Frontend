import { describe, it, expect } from 'vitest'
import { parseCsv } from './csv'

describe('parseCsv', () => {
  it('separa filas y columnas simples', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('respeta comas dentro de comillas', () => {
    expect(parseCsv('nombre,nota\n"Pérez, Juan","limpió todo, sin novedad"')).toEqual([
      ['nombre', 'nota'],
      ['Pérez, Juan', 'limpió todo, sin novedad'],
    ])
  })

  it('desescapa comillas dobles', () => {
    expect(parseCsv('obs\n"dijo ""listo"""')).toEqual([['obs'], ['dijo "listo"']])
  })

  it('maneja CRLF y la ausencia de salto final', () => {
    expect(parseCsv('a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('ignora líneas vacías sueltas', () => {
    expect(parseCsv('a,b\n1,2\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('texto vacío da sin filas', () => {
    expect(parseCsv('')).toEqual([])
  })
})
