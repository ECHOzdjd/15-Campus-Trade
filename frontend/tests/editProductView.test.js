import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    back: vi.fn(),
  },
  route: {
    params: { id: '42' },
  },
  message: {
    success: vi.fn(),
    error: vi.fn(),
  },
  products: {
    getDetail: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => mocks.router,
}))

vi.mock('../src/api/index.js', () => ({
  products: mocks.products,
}))

vi.mock('element-plus', () => ({
  ElMessage: mocks.message,
}))

const globalStubs = {
  AppHeader: { template: '<header />' },
  ImageUploader: { template: '<div />' },
  'el-card': { template: '<section><slot name="header" /><slot /></section>' },
  'el-form': {
    template: '<form><slot /></form>',
    methods: {
      validate() {
        return Promise.resolve(true)
      },
    },
  },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-input': { props: ['modelValue'], template: '<input />' },
  'el-select': { template: '<select><slot /></select>' },
  'el-option': { template: '<option />' },
  'el-button': { template: '<button><slot /></button>' },
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mocks.products.getDetail.mockResolvedValue({
    data: {
      title: 'Desk Lamp',
      price: 32,
      category: 'books',
      condition: 'good',
      status: 'available',
      description: 'Lamp',
      images: ['/uploads/a.png'],
    },
  })
  mocks.products.update.mockResolvedValue({})
})

describe('EditProductView', () => {
  it('loads product and submits updates', async () => {
    const EditProductView = (await import('../src/views/EditProductView.vue')).default
    const wrapper = mount(EditProductView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(mocks.products.getDetail).toHaveBeenCalledWith('42')
    wrapper.vm.form.title = 'Updated Lamp'
    wrapper.vm.form.price = 50
    wrapper.vm.form.category = 'books'
    wrapper.vm.form.condition = 'good'
    wrapper.vm.form.status = 'available'
    wrapper.vm.form.description = 'Updated'
    wrapper.vm.form.images = ['/uploads/b.png']
    await wrapper.vm.handleSubmit()
    await flushPromises()

    expect(mocks.products.update).toHaveBeenCalledWith('42', expect.objectContaining({
      title: 'Updated Lamp',
      price: 50,
      images: ['/uploads/b.png'],
    }))
    expect(mocks.router.push).toHaveBeenCalledWith('/product/42')
  })

  it('backs out when cancel is clicked', async () => {
    const EditProductView = (await import('../src/views/EditProductView.vue')).default
    const wrapper = mount(EditProductView, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.find('button').trigger('click')
    expect(mocks.router.back).toHaveBeenCalled()
  })
})
