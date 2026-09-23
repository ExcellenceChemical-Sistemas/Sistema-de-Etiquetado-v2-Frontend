import { describe, it, expect, vi, beforeEach } from 'vitest'

const toastError = vi.fn()
vi.mock('vue-sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }))

const logout = vi.fn(() => Promise.resolve())
const navigateTo = vi.fn(() => Promise.resolve())

// useApi usa los auto-imports de Nuxt: acá se reemplazan por dobles.
vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'http://api.test' } }))
vi.stubGlobal('useSupabaseClient', () => ({
  auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
}))
vi.stubGlobal('useAuth', () => ({ logout }))
vi.stubGlobal('navigateTo', navigateTo)

import { useApi } from './useApi'

/** Hace que los próximos requests respondan con este status y cuerpo, sin red. */
function responder(status: number, data: unknown) {
  const api = useApi()
  api.defaults.adapter = async (config: any) => {
    const respuesta = { status, data, statusText: '', headers: {}, config }
    if (status >= 200 && status < 300) return respuesta
    const err: any = new Error(`status ${status}`)
    err.response = respuesta
    err.isAxiosError = true
    throw err
  }
  return api
}

beforeEach(() => {
  toastError.mockClear()
  logout.mockClear()
  navigateTo.mockClear()
})

describe('interceptor de useApi', () => {
  it('un 403 CUENTA_DESACTIVADA cierra sesión, avisa y manda al login', async () => {
    const api = responder(403, { code: 'CUENTA_DESACTIVADA', message: 'Tu cuenta está desactivada.' })

    await expect(api.get('/lotes')).rejects.toBeDefined() // el error igual le llega a quien llamó
    expect(toastError).toHaveBeenCalledWith('Tu cuenta está desactivada.')
    expect(logout).toHaveBeenCalledTimes(1)
    expect(navigateTo).toHaveBeenCalledWith('/login')
  })

  it('un 403 por falta de permiso NO cierra la sesión', async () => {
    const api = responder(403, { message: 'No tienes permiso para esta acción' })

    await expect(api.get('/lotes')).rejects.toBeDefined()
    expect(logout).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('varios requests fallando a la vez cierran la sesión una sola vez', async () => {
    const api = responder(403, { code: 'CUENTA_DESACTIVADA', message: 'x' })

    await Promise.allSettled([api.get('/a'), api.get('/b'), api.get('/c')])
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('las respuestas correctas pasan sin tocar nada', async () => {
    const api = responder(200, { ok: true })

    const { data } = await api.get('/lotes')
    expect(data).toEqual({ ok: true })
    expect(logout).not.toHaveBeenCalled()
  })
})
