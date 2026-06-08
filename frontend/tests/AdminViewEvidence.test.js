import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h, inject, provide } from 'vue'
import AdminView from '../src/views/AdminView.vue'

const mocks = vi.hoisted(() => ({
  adminApi: {
    getDisputes: vi.fn(),
    getProducts: vi.fn(),
  },
  disputesApi: {
    resolve: vi.fn(),
  },
  message: {
    error: vi.fn(),
  },
}))

vi.mock('../src/api/index.js', () => ({
  admin: mocks.adminApi,
  disputes: mocks.disputesApi,
}))

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    ElMessage: mocks.message,
  }
})

vi.mock('../src/utils/url.js', () => ({
  resolveAssetUrl: (url) => url,
}))

const globalStubs = {
  AppHeader: { template: '<header />' },
  'el-button': { template: '<button><slot /></button>' },
  'el-tabs': { template: '<div><slot /></div>' },
  'el-tab-pane': { template: '<section><slot /></section>' },
  'el-select': { template: '<select><slot /></select>' },
  'el-option': { template: '<option />' },
  'el-input': { template: '<input />' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-image': {
    props: ['src'],
    template: '<img class="dispute-evidence-image" :src="src" />',
  },
  'el-table': {
    props: ['data'],
    setup(props, { slots }) {
      provide('tableProps', props)
      return () => h('div', slots.default?.())
    },
  },
  'el-table-column': {
    setup(props, { slots }) {
      const tableProps = inject('tableProps')
      return () => h('div', (tableProps?.data || []).map((row) => h(
        'div',
        slots.default ? slots.default({ row }) : ''
      )))
    },
  },
}

describe('AdminView dispute evidence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.adminApi.getDisputes.mockResolvedValue({
      data: {
        disputes: [
          {
            id: 7,
            orderId: 21,
            status: 'open',
            product: { title: '争议商品' },
            buyer: { username: '买家' },
            seller: { username: '卖家' },
            reason: '商品与预期不符',
            evidenceImages: ['/uploads/buyer-proof.png'],
          },
        ],
      },
    })
    mocks.adminApi.getProducts.mockResolvedValue({ data: { products: [] } })
  })

  it('shows buyer dispute evidence images to admins', async () => {
    const wrapper = mount(AdminView, {
      global: {
        stubs: globalStubs,
        directives: {
          loading: {},
        },
      },
    })
    await flushPromises()

    const images = wrapper.findAll('img.dispute-evidence-image')

    expect(images).toHaveLength(1)
    expect(images[0].attributes('src')).toBe('/uploads/buyer-proof.png')
  })
})
