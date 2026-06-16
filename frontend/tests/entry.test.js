import { beforeEach, describe, expect, it, vi } from 'vitest'

const vue = vi.hoisted(() => ({
  createApp: vi.fn(() => ({
    use: vi.fn().mockReturnThis(),
    mount: vi.fn(),
  })),
  createPinia: vi.fn(() => ({ pinia: true })),
}))

vi.mock('vue', () => vue)
vi.mock('pinia', () => ({
  createPinia: vue.createPinia,
}))
vi.mock('element-plus', () => ({
  default: { name: 'ElementPlus' },
}))
vi.mock('element-plus/dist/index.css', () => ({}))
vi.mock('element-plus/es/locale/lang/zh-cn', () => ({ default: { name: 'zh-cn' } }))
vi.mock('../src/router/index.js', () => ({
  default: { name: 'router' },
}))
vi.mock('../src/App.vue', () => ({
  default: { name: 'App' },
}))
vi.mock('../src/styles/linear-theme.css', () => ({}))
vi.mock('../src/styles/element-override.scss', () => ({}))
vi.mock('../src/styles/global.css', () => ({}))

describe('entry module', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('boots the app with pinia, router, and element-plus', async () => {
    await import('../src/main.js')

    expect(vue.createApp).toHaveBeenCalled()
    const app = vue.createApp.mock.results[0].value
    expect(app.use).toHaveBeenCalledTimes(3)
    expect(app.mount).toHaveBeenCalledWith('#app')
  })
})
