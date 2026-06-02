import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AppHeader from '../src/components/AppHeader.vue'
import { useUserStore } from '../src/stores/user.js'

const routerPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))

vi.mock('../src/api/index.js', () => ({
  conversations: {
    getList: vi.fn().mockResolvedValue({ data: { conversations: [] } }),
  },
}))

const globalStubs = {
  RouterLink: {
    props: ['to'],
    template: '<a><slot /></a>',
  },
  'el-button': {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
  'el-dropdown': {
    template: '<div><slot /><slot name="dropdown" /></div>',
  },
  'el-dropdown-menu': {
    template: '<div><slot /></div>',
  },
  'el-dropdown-item': {
    props: ['command'],
    template: '<button class="dropdown-item"><slot /></button>',
  },
  'el-avatar': {
    template: '<span><slot /></span>',
  },
  'el-badge': {
    template: '<span><slot /></span>',
  },
  'el-dialog': true,
  'el-input': true,
  'el-icon': {
    template: '<span><slot /></span>',
  },
}

function mountHeader(userInfo) {
  setActivePinia(createPinia())
  const userStore = useUserStore()
  userStore.setToken('test-token')
  userStore.userInfo = userInfo

  return mount(AppHeader, {
    global: {
      stubs: globalStubs,
    },
  })
}

describe('AppHeader admin entry', () => {
  beforeEach(() => {
    localStorage.clear()
    routerPush.mockClear()
  })

  it('shows admin entry for admin user', async () => {
    const wrapper = mountHeader({ id: 1, username: 'Admin', role: 'admin' })
    await flushPromises()

    expect(wrapper.text()).toContain('管理后台')
  })

  it('does not show admin entry for regular user', async () => {
    const wrapper = mountHeader({ id: 2, username: 'User', role: 'user' })
    await flushPromises()

    expect(wrapper.text()).not.toContain('管理后台')
  })
})
