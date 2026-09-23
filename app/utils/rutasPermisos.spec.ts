import { describe, it, expect } from 'vitest'
import { rutaPermitida } from './rutasPermisos'
import type { Usuario } from './permisos'

function usuario(parcial: Partial<Usuario> = {}): Usuario {
  return { id: 1, nombre: 'x', esAdmin: false, permisos: [], ...parcial }
}

function conPermiso(recurso: string, nivel: string): Usuario {
  return usuario({
    permisos: [
      { recurso, puedeVer: false, puedeCrear: false, puedeEditar: false, puedeEliminar: false, [nivel]: true } as any,
    ],
  })
}

describe('rutaPermitida', () => {
  it('las rutas libres las puede ver cualquiera, incluso sin usuario', () => {
    expect(rutaPermitida('/', null, false)).toBe(true)
    expect(rutaPermitida('/mi-cuenta', usuario(), false)).toBe(true)
  })

  it('sin usuario cargado se niegan las rutas con permiso', () => {
    expect(rutaPermitida('/lotes', null, false)).toBe(false)
  })

  it('el admin entra a todo', () => {
    expect(rutaPermitida('/usuarios', usuario({ esAdmin: true }), true)).toBe(true)
  })

  it('pide el nivel exacto: Generar etiqueta exige ETIQUETAS.puedeCrear, no puedeVer', () => {
    expect(rutaPermitida('/generar-etiqueta', conPermiso('ETIQUETAS', 'puedeVer'), false)).toBe(false)
    expect(rutaPermitida('/generar-etiqueta', conPermiso('ETIQUETAS', 'puedeCrear'), false)).toBe(true)
  })

  it('las subrutas heredan el permiso del prefijo', () => {
    expect(rutaPermitida('/lotes/5', conPermiso('LOTES', 'puedeVer'), false)).toBe(true)
    expect(rutaPermitida('/lotes/5', conPermiso('PRODUCTOS', 'puedeVer'), false)).toBe(false)
  })

  it('un prefijo parecido no cuenta: /lotesx no es /lotes', () => {
    expect(rutaPermitida('/lotesx', usuario(), false)).toBe(true) // ruta libre, no la de lotes
  })

  it('/clientes y /pedidos comparten PEDIDOS', () => {
    const u = conPermiso('PEDIDOS', 'puedeVer')
    expect(rutaPermitida('/clientes', u, false)).toBe(true)
    expect(rutaPermitida('/pedidos', u, false)).toBe(true)
  })

  it('el Admin de KPIs entra a /usuarios sin el permiso USUARIOS, pero solo ahí', () => {
    const u = usuario({ esAdminKpis: true })
    expect(rutaPermitida('/usuarios', u, false)).toBe(true)
    expect(rutaPermitida('/lotes', u, false)).toBe(false)
  })
})
