import { describe, expect, it } from 'vitest'
import { mensajeWhatsapp, normalizarCelular, urlWhatsapp } from './whatsappPedido'

describe('normalizarCelular', () => {
  it.each([
    ['987654321', '51987654321'],
    ['987 654 321', '51987654321'],
    ['987-654-321', '51987654321'],
    ['+51 987 654 321', '51987654321'],
    ['51987654321', '51987654321'],
    ['0051987654321', '51987654321'],
    ['  (+51) 987654321  ', '51987654321'],
  ])('%s → %s', (entrada, esperado) => {
    expect(normalizarCelular(entrada)).toBe(esperado)
  })

  it('respeta un número internacional que trae "+"', () => {
    expect(normalizarCelular('+1 415 555 2671')).toBe('14155552671')
  })

  it.each([['(01) 555-1234'], ['5551234'], ['98765432'], ['9876543210'], ['abc'], [''], ['   ']])(
    'no adivina con %j (fijo, cortado o basura) → null',
    (entrada) => {
      expect(normalizarCelular(entrada)).toBeNull()
    },
  )

  it('null y undefined dan null', () => {
    expect(normalizarCelular(null)).toBeNull()
    expect(normalizarCelular(undefined)).toBeNull()
  })
})

describe('mensajeWhatsapp', () => {
  const enlace = 'https://excellencechemical.vercel.app/p/abc'

  it('lleva la frase de la etapa, la proforma y el enlace', () => {
    const m = mensajeWhatsapp('SALIO', 'PF-0042', enlace)
    expect(m).toContain('va en camino')
    expect(m).toContain('PF-0042')
    expect(m).toContain(enlace)
  })

  it('cada etapa tiene su propia frase', () => {
    const frases = (['RECIBIDO', 'EN_PREPARACION', 'PREPARADO', 'SALIO', 'ENTREGADO'] as const).map((e) =>
      mensajeWhatsapp(e, 'PF-1', enlace),
    )
    expect(new Set(frases).size).toBe(5)
  })

  it('limpia la proforma (saltos de línea, largo) y no deja el mensaje roto si está vacía', () => {
    expect(mensajeWhatsapp('SALIO', 'PF-1\n\nOtra', enlace)).toContain('N° de proforma: PF-1 Otra')
    expect(mensajeWhatsapp('SALIO', '   ', enlace)).toContain('s/n')
    expect(mensajeWhatsapp('SALIO', 'x'.repeat(200), enlace)).toContain('x'.repeat(60) + '\n')
  })
})

describe('urlWhatsapp', () => {
  it('arma wa.me con el número normalizado y el texto escapado', () => {
    const url = urlWhatsapp('987 654 321', 'Hola & adiós\nlínea 2')!
    expect(url.startsWith('https://wa.me/51987654321?text=')).toBe(true)
    expect(url).toContain(encodeURIComponent('Hola & adiós\nlínea 2'))
    expect(url).not.toContain(' ')
  })

  it('sin celular usable devuelve null (no se muestra el botón)', () => {
    expect(urlWhatsapp(null, 'x')).toBeNull()
    expect(urlWhatsapp('5551234', 'x')).toBeNull()
  })
})
