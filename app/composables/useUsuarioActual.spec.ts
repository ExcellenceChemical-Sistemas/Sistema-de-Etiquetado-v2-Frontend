import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
vi.mock('./useApi', () => ({ useApi: () => ({ get }) }))

import { useUsuarioActual } from './useUsuarioActual'

const base = { id: 1, nombre: 'Maya', esAdmin: false }
const conPermisos = (permisos: unknown[]) => ({ data: { data: { ...base, permisos } } })

beforeEach(async () => {
  get.mockReset()
  useUsuarioActual().reset()
  get.mockResolvedValueOnce(conPermisos([{ recurso: 'LOTES', puedeVer: true }]))
  await useUsuarioActual().cargar()
  get.mockReset()
})

describe('refrescar', () => {
  it('devuelve false y no toca nada si los permisos no cambiaron', async () => {
    get.mockResolvedValueOnce(conPermisos([{ recurso: 'LOTES', puedeVer: true }]))
    const { refrescar, usuarioActual } = useUsuarioActual()
    const antes = usuarioActual.value

    expect(await refrescar()).toBe(false)
    expect(usuarioActual.value).toBe(antes)
  })

  it('devuelve true y actualiza el usuario si cambiaron', async () => {
    get.mockResolvedValueOnce(conPermisos([]))
    const { refrescar, usuarioActual } = useUsuarioActual()

    expect(await refrescar()).toBe(true)
    expect(usuarioActual.value?.permisos).toEqual([])
  })

  it('un error de red no vacía el usuario ni desloguea', async () => {
    get.mockRejectedValueOnce(new Error('sin red'))
    const { refrescar, usuarioActual } = useUsuarioActual()

    expect(await refrescar()).toBe(false)
    expect(usuarioActual.value?.nombre).toBe('Maya')
  })

  it('descarta la respuesta si hubo reset() mientras estaba en vuelo (logout o cambio de usuario)', async () => {
    let responder!: (v: unknown) => void
    get.mockReturnValueOnce(new Promise((r) => (responder = r)))
    const { refrescar, reset, usuarioActual } = useUsuarioActual()

    const pendiente = refrescar()
    reset()
    responder(conPermisos([{ recurso: 'USUARIOS', puedeVer: true }]))

    expect(await pendiente).toBe(false)
    expect(usuarioActual.value).toBeNull() // el usuario viejo no vuelve a escribirse
  })

  it('sin usuario cargado no pide nada', async () => {
    const { refrescar, reset } = useUsuarioActual()
    reset()

    expect(await refrescar()).toBe(false)
    expect(get).not.toHaveBeenCalled()
  })
})
