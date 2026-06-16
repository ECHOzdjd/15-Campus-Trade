import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  auth: {
    register: vi.fn(),
    login: vi.fn(),
    getMe: vi.fn(),
    updatePassword: vi.fn(),
  },
  products: {
    getList: vi.fn(),
    getDetail: vi.fn(),
    create: vi.fn(),
    getMine: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  orders: {
    getList: vi.fn(),
    getDetail: vi.fn(),
    create: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
  },
  upload: {
    uploadImage: vi.fn(),
  },
}))

vi.mock('@/api', () => ({
  default: api,
}))

const globalStubs = {
  'el-button': { template: '<button><slot /></button>' },
}

beforeEach(() => {
  vi.clearAllMocks()
  api.auth.register.mockResolvedValue({ data: { token: 'token' } })
  api.auth.login.mockResolvedValue({ data: { token: 'token' } })
  api.auth.getMe.mockResolvedValue({})
  api.auth.updatePassword.mockResolvedValue({})
  api.products.getList.mockResolvedValue({})
  api.products.getDetail.mockResolvedValue({})
  api.products.create.mockResolvedValue({})
  api.products.getMine.mockResolvedValue({})
  api.products.update.mockResolvedValue({})
  api.products.remove.mockResolvedValue({})
  api.orders.getList.mockResolvedValue({})
  api.orders.getDetail.mockResolvedValue({})
  api.orders.create.mockResolvedValue({})
  api.orders.confirm.mockResolvedValue({})
  api.orders.cancel.mockResolvedValue({})
  api.upload.uploadImage.mockResolvedValue({})
  localStorage.clear()
})

describe('TestView', () => {
  it('invokes API helpers from test controls', async () => {
    const TestView = (await import('../src/views/TestView.vue')).default
    const wrapper = mount(TestView, { global: { stubs: globalStubs } })

    await wrapper.vm.testRegister()
    await wrapper.vm.testLogin()
    wrapper.vm.testGetMe()
    wrapper.vm.testUpdatePassword()
    wrapper.vm.testGetProducts()
    wrapper.vm.testGetProductDetail()
    wrapper.vm.testCreateProduct()
    wrapper.vm.testGetMyProducts()
    wrapper.vm.testUpdateProduct()
    wrapper.vm.testDeleteProduct()
    wrapper.vm.testGetOrders()
    wrapper.vm.testGetOrderDetail()
    wrapper.vm.testCreateOrder()
    wrapper.vm.testConfirmOrder()
    wrapper.vm.testCancelOrder()
    wrapper.vm.testUploadImage()
    wrapper.vm.clearConsole()

    expect(api.auth.register).toHaveBeenCalled()
    expect(api.auth.login).toHaveBeenCalled()
    expect(api.products.getList).toHaveBeenCalled()
    expect(api.orders.getList).toHaveBeenCalled()
    expect(api.upload.uploadImage).toHaveBeenCalled()
    expect(wrapper.vm.lastResponse).toBeNull()
  })
})
