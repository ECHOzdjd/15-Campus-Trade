import { beforeEach, describe, expect, it, vi } from 'vitest'

const interceptorHandlers = vi.hoisted(() => ({
  requestSuccess: null,
  requestError: null,
  responseSuccess: null,
  responseError: null,
}))

const mockAxiosInstance = vi.hoisted(() => ({
  interceptors: {
    request: {
      use: vi.fn((success, error) => {
        interceptorHandlers.requestSuccess = success
        interceptorHandlers.requestError = error
      }),
    },
    response: {
      use: vi.fn((success, error) => {
        interceptorHandlers.responseSuccess = success
        interceptorHandlers.responseError = error
      }),
    },
  },
}))

const axiosCreate = vi.hoisted(() => vi.fn(() => mockAxiosInstance))

vi.mock('axios', () => ({
  default: {
    create: axiosCreate,
  },
}))

describe('request utility interceptors', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    window.history.pushState({}, '', '/')
    await import('../src/utils/request.js')
  })

  it('creates axios instance with API base URL and timeout', () => {
    expect(axiosCreate).toHaveBeenCalledWith({
      baseURL: 'http://localhost:3001/api',
      timeout: 10000,
    })
  })

  it('attaches authorization and csrf headers for mutating requests', () => {
    localStorage.setItem('token', 'jwt-token')

    const config = interceptorHandlers.requestSuccess({
      method: 'post',
      headers: {},
    })

    expect(config.headers.Authorization).toBe('Bearer jwt-token')
    expect(config.headers['X-CSRF-Token']).toMatch(/^csrf_/)
    expect(sessionStorage.getItem('_csrf_token')).toBe(config.headers['X-CSRF-Token'])
  })

  it('does not add csrf token to read-only requests', () => {
    const config = interceptorHandlers.requestSuccess({
      method: 'get',
      headers: {},
    })

    expect(config.headers['X-CSRF-Token']).toBeUndefined()
  })

  it('unwraps successful responses to response data', () => {
    expect(interceptorHandlers.responseSuccess({ data: { code: 200 } }))
      .toEqual({ code: 200 })
  })

  it('clears auth state and redirects on 401 responses', async () => {
    localStorage.setItem('token', 'jwt-token')
    sessionStorage.setItem('_csrf_token', 'csrf-existing')

    await expect(interceptorHandlers.responseError({
      response: {
        status: 401,
        data: { code: 401, message: 'unauthorized' },
      },
    })).rejects.toEqual({ code: 401, message: 'unauthorized' })

    expect(localStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('_csrf_token')).toBeNull()
    expect(window.location.pathname).toBe('/login')
  })
})
