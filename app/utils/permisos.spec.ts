import { describe, it, expect } from 'vitest'
import {
  RECURSOS,
  crearPermisosStateVacio,
  poblarPermisosState,
  permisosStateAArray,
  crearAccesosKpisIsoStateVacio,
  poblarAccesosKpisIsoState,
  accesosKpisIsoStateADto,
  PROCESOS_INDICADOR,
  type Permiso,
} from './permisos'

describe('crearPermisosStateVacio', () => {
  it('crea un flag en false para cada recurso y las 4 acciones', () => {
    const state = crearPermisosStateVacio()
    expect(Object.keys(state).sort()).toEqual([...RECURSOS].sort())
    for (const recurso of RECURSOS) {
      expect(state[recurso]).toEqual({
        puedeVer: false,
        puedeCrear: false,
        puedeEditar: false,
        puedeEliminar: false,
      })
    }
  })
})

describe('poblarPermisosState', () => {
  it('vuelca los permisos recibidos sobre el estado vacío', () => {
    const state = crearPermisosStateVacio()
    const permisos: Permiso[] = [
      { recurso: 'LOTES', puedeVer: true, puedeCrear: true, puedeEditar: false, puedeEliminar: false },
    ]
    poblarPermisosState(state, permisos)
    expect(state.LOTES).toEqual({ puedeVer: true, puedeCrear: true, puedeEditar: false, puedeEliminar: false })
    expect(state.PRODUCTOS).toEqual({ puedeVer: false, puedeCrear: false, puedeEditar: false, puedeEliminar: false })
  })

  it('un recurso desconocido (enum desincronizado) se ignora sin romper', () => {
    const state = crearPermisosStateVacio()
    const permisos = [
      { recurso: 'RECURSO_INEXISTENTE', puedeVer: true, puedeCrear: true, puedeEditar: true, puedeEliminar: true },
    ] as unknown as Permiso[]
    expect(() => poblarPermisosState(state, permisos)).not.toThrow()
    for (const recurso of RECURSOS) {
      expect(state[recurso].puedeVer).toBe(false)
    }
  })
})

describe('permisosStateAArray', () => {
  it('es el inverso de poblarPermisosState: ida y vuelta devuelve lo mismo', () => {
    const state = crearPermisosStateVacio()
    const original: Permiso[] = [
      { recurso: 'COTIZACIONES', puedeVer: true, puedeCrear: false, puedeEditar: true, puedeEliminar: false },
    ]
    poblarPermisosState(state, original)
    const array = permisosStateAArray(state)

    expect(array).toHaveLength(RECURSOS.length)
    expect(array.find((p) => p.recurso === 'COTIZACIONES')).toEqual({
      recurso: 'COTIZACIONES',
      puedeVer: true,
      puedeCrear: false,
      puedeEditar: true,
      puedeEliminar: false,
    })
  })
})

describe('crearAccesosKpisIsoStateVacio', () => {
  it('crea los 8 procesos y el bloque ISO en false, con gestionaObsoleto en false', () => {
    const state = crearAccesosKpisIsoStateVacio()
    expect(Object.keys(state.indicador).sort()).toEqual([...PROCESOS_INDICADOR].sort())
    for (const proceso of PROCESOS_INDICADOR) {
      expect(state.indicador[proceso]).toEqual({
        puedeVer: false,
        puedeDescargar: false,
        puedeAdjuntar: false,
        puedeEditar: false,
        puedeEliminar: false,
      })
    }
    expect(state.iso).toEqual({
      puedeVer: false,
      puedeDescargar: false,
      puedeAdjuntar: false,
      puedeEditar: false,
      puedeEliminar: false,
      gestionaObsoleto: false,
    })
  })
})

describe('poblarAccesosKpisIsoState', () => {
  it('vuelca accesosIndicador indexando por proceso, no por id', () => {
    const state = crearAccesosKpisIsoStateVacio()
    poblarAccesosKpisIsoState(state, {
      accesosIndicador: [
        { proceso: 'COMERCIAL', puedeVer: true, puedeDescargar: true, puedeAdjuntar: false, puedeEditar: false, puedeEliminar: false },
      ],
      accesoIso: null,
    })
    expect(state.indicador.COMERCIAL.puedeVer).toBe(true)
    expect(state.indicador.COMPRAS.puedeVer).toBe(false)
  })

  it('un proceso desconocido se ignora sin romper', () => {
    const state = crearAccesosKpisIsoStateVacio()
    expect(() =>
      poblarAccesosKpisIsoState(state, {
        accesosIndicador: [
          { proceso: 'PROCESO_FANTASMA', puedeVer: true, puedeDescargar: true, puedeAdjuntar: true, puedeEditar: true, puedeEliminar: true } as any,
        ],
        accesoIso: null,
      }),
    ).not.toThrow()
  })

  it('vuelve a poblar desde cero: un proceso que ya no viene en la respuesta queda en false', () => {
    const state = crearAccesosKpisIsoStateVacio()
    state.indicador.COMERCIAL.puedeVer = true
    poblarAccesosKpisIsoState(state, { accesosIndicador: [], accesoIso: null })
    expect(state.indicador.COMERCIAL.puedeVer).toBe(false)
  })

  it('accesoIso null deja el bloque ISO en blanco', () => {
    const state = crearAccesosKpisIsoStateVacio()
    poblarAccesosKpisIsoState(state, { accesosIndicador: [], accesoIso: null })
    expect(state.iso).toEqual({
      puedeVer: false,
      puedeDescargar: false,
      puedeAdjuntar: false,
      puedeEditar: false,
      puedeEliminar: false,
      gestionaObsoleto: false,
    })
  })

  it('copia los 5 flags de ISO más gestionaObsoleto cuando viene con datos', () => {
    const state = crearAccesosKpisIsoStateVacio()
    poblarAccesosKpisIsoState(state, {
      accesosIndicador: [],
      accesoIso: {
        puedeVer: true,
        puedeDescargar: false,
        puedeAdjuntar: true,
        puedeEditar: false,
        puedeEliminar: true,
        gestionaObsoleto: true,
      },
    })
    expect(state.iso).toEqual({
      puedeVer: true,
      puedeDescargar: false,
      puedeAdjuntar: true,
      puedeEditar: false,
      puedeEliminar: true,
      gestionaObsoleto: true,
    })
  })
})

describe('accesosKpisIsoStateADto', () => {
  it('omite los procesos sin ningún flag activo', () => {
    const state = crearAccesosKpisIsoStateVacio()
    state.indicador.COMERCIAL.puedeVer = true
    const dto = accesosKpisIsoStateADto(state)
    expect(dto.accesosIndicador).toEqual([
      expect.objectContaining({ proceso: 'COMERCIAL', puedeVer: true }),
    ])
  })

  it('accesoIso es null cuando no hay ningún flag ni gestionaObsoleto activo', () => {
    const state = crearAccesosKpisIsoStateVacio()
    const dto = accesosKpisIsoStateADto(state)
    expect(dto.accesoIso).toBeNull()
  })

  it('accesoIso se incluye si solo gestionaObsoleto está activo (sin ningún otro flag)', () => {
    const state = crearAccesosKpisIsoStateVacio()
    state.iso.gestionaObsoleto = true
    const dto = accesosKpisIsoStateADto(state)
    expect(dto.accesoIso).toEqual(expect.objectContaining({ gestionaObsoleto: true }))
  })

  it('accesoIso se incluye si algún flag de documento está activo', () => {
    const state = crearAccesosKpisIsoStateVacio()
    state.iso.puedeVer = true
    const dto = accesosKpisIsoStateADto(state)
    expect(dto.accesoIso).toEqual(expect.objectContaining({ puedeVer: true }))
  })
})
