import { describe, expect, it } from 'vitest'
import { clienteSchema } from './cliente.schema'

describe('clienteSchema — autorización de contacto', () => {
  it('sin datos de contacto no exige la casilla', () => {
    expect(clienteSchema.safeParse({ nombre: 'Farmacia' }).success).toBe(true)
  })

  it('con celular exige la casilla marcada', () => {
    const r = clienteSchema.safeParse({ nombre: 'Farmacia', celular: '987654321' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['autorizaContacto'])
  })

  it('con correo exige la casilla marcada', () => {
    expect(clienteSchema.safeParse({ nombre: 'F', email: 'a@b.pe' }).success).toBe(false)
  })

  it('con contacto y la casilla marcada es válido', () => {
    expect(
      clienteSchema.safeParse({ nombre: 'F', celular: '987654321', email: 'a@b.pe', autorizaContacto: true }).success,
    ).toBe(true)
  })

  it('un celular en blanco (solo espacios) no cuenta como dato de contacto', () => {
    expect(clienteSchema.safeParse({ nombre: 'F', celular: '   ' }).success).toBe(true)
  })
})
