import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: {
    getMe: vi.fn(),
  },
}))

vi.mock('../src/api/index.js', () => ({
  auth: mocks.auth,
}))

function makeToken(role) {
  const payload = btoa(JSON.stringify({ id: 1, role }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `header.${payload}.signature`
}

describe('admin route guard', () => {
  let router

  beforeEach(async () => {
    localStorage.clear()
    mocks.auth.getMe.mockReset()
    window.history.replaceState({}, '', '/')
    vi.resetModules()
    ;({ default: router } = await import('../src/router/index.js'))
  })

  it('redirects unauthenticated users to login', async () => {
    await router.push('/admin')

    expect(router.currentRoute.value.path).toBe('/login')
  }, 10000)

  it('redirects non-admin users to home', async () => {
    localStorage.setItem('token', makeToken('user'))
    mocks.auth.getMe.mockResolvedValue({ data: { role: 'user' } })

    await router.push('/admin')

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('allows admin users to open admin page', async () => {
    localStorage.setItem('token', makeToken('admin'))
    mocks.auth.getMe.mockResolvedValue({ data: { role: 'admin' } })

    await router.push('/admin')

    expect(router.currentRoute.value.path).toBe('/admin')
  })

  it('allows admin users even when their stored token has stale role data', async () => {
    localStorage.setItem('token', makeToken('user'))
    mocks.auth.getMe.mockResolvedValue({ data: { role: 'admin' } })

    await router.push('/admin')

    expect(router.currentRoute.value.path).toBe('/admin')
  })
})
