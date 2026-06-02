import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AdminView from '../src/views/AdminView.vue'

const mocks = vi.hoisted(() => ({
  adminApi: {
    getDisputes: vi.fn(),
    getProducts: vi.fn(),
    removeProduct: vi.fn(),
  },
  disputesApi: {
    resolve: vi.fn(),
  },
  message: {
    success: vi.fn(),
    error: vi.fn(),
  },
  messageBox: {
    confirm: vi.fn(),
    prompt: vi.fn(),
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
    ElMessageBox: mocks.messageBox,
  }
})

const globalStubs = {
  AppHeader: { template: '<header class="app-header-stub" />' },
  'el-button': {
    props: ['loading'],
    template: '<button :disabled="loading" @click="$emit(\'click\')"><slot /></button>',
  },
  'el-tabs': { template: '<div><slot /></div>' },
  'el-tab-pane': { template: '<section><slot /></section>' },
  'el-table': { template: '<div><slot /></div>' },
  'el-table-column': true,
  'el-input': { template: '<input />' },
  'el-tag': { template: '<span><slot /></span>' },
}

function mountAdminView() {
  return mount(AdminView, {
    global: {
      stubs: globalStubs,
      directives: {
        loading: {},
      },
    },
  })
}

describe('AdminView', () => {
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
            reason: '商品与描述不符',
          },
        ],
      },
    })
    mocks.adminApi.getProducts.mockResolvedValue({
      data: {
        products: [
          {
            id: 9,
            title: '违规商品',
            category: '书籍',
            price: 12,
            status: 'available',
            seller: { username: '卖家' },
          },
        ],
      },
    })
    mocks.adminApi.removeProduct.mockResolvedValue({ code: 200 })
    mocks.disputesApi.resolve.mockResolvedValue({ code: 200 })
    mocks.messageBox.confirm.mockResolvedValue()
    mocks.messageBox.prompt.mockResolvedValue({ value: '同意退款' })
  })

  it('loads disputes and products on mount', async () => {
    const wrapper = mountAdminView()
    await flushPromises()

    expect(mocks.adminApi.getDisputes).toHaveBeenCalledTimes(1)
    expect(mocks.adminApi.getProducts).toHaveBeenCalledWith({
      status: 'all',
      search: undefined,
      pageSize: 50,
    })
    expect(wrapper.vm.disputesList).toHaveLength(1)
    expect(wrapper.vm.productsList).toHaveLength(1)
  })

  it('passes trimmed product search to admin product API', async () => {
    const wrapper = mountAdminView()
    await flushPromises()

    wrapper.vm.productSearch = '  违规  '
    await wrapper.vm.loadProducts()

    expect(mocks.adminApi.getProducts).toHaveBeenLastCalledWith({
      status: 'all',
      search: '违规',
      pageSize: 50,
    })
  })

  it('confirms and removes product through admin API', async () => {
    const wrapper = mountAdminView()
    await flushPromises()

    await wrapper.vm.removeProduct({ id: 9, title: '违规商品' })

    expect(mocks.messageBox.confirm).toHaveBeenCalled()
    expect(mocks.adminApi.removeProduct).toHaveBeenCalledWith(9)
    expect(mocks.message.success).toHaveBeenCalledWith('商品已删除')
    expect(mocks.adminApi.getProducts).toHaveBeenCalledTimes(2)
  })

  it('prompts and resolves dispute through admin flow', async () => {
    const wrapper = mountAdminView()
    await flushPromises()

    await wrapper.vm.resolveDispute({ id: 7 }, 'refund')

    expect(mocks.messageBox.prompt).toHaveBeenCalled()
    expect(mocks.disputesApi.resolve).toHaveBeenCalledWith(7, {
      result: 'refund',
      resolutionNote: '同意退款',
    })
    expect(mocks.message.success).toHaveBeenCalledWith('争议已处理')
    expect(mocks.adminApi.getDisputes).toHaveBeenCalledTimes(2)
  })
})
