import { describe, it, expect, beforeEach } from 'vitest'
import router from '../src/router/index.js'

function makeToken(role) {
  const payload = btoa(JSON.stringify({ id: 1, role }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `header.${payload}.signature`
}

describe('admin route guard', () => {
  beforeEach(async () => {
    localStorage.clear()
    await router.push('/')
  })

  it('redirects unauthenticated users to login', async () => {
    await router.push('/admin')

    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('redirects non-admin users to home', async () => {
    localStorage.setItem('token', makeToken('user'))

    await router.push('/admin')

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('allows admin users to open admin page', async () => {
    localStorage.setItem('token', makeToken('admin'))

    await router.push('/admin')

    expect(router.currentRoute.value.path).toBe('/admin')
  })
})
