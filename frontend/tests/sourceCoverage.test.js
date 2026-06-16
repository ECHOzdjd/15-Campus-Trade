import { h, inject, nextTick, provide } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    back: vi.fn(),
  },
  route: {
    params: { id: '42' },
    query: {},
  },
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  messageBox: {
    confirm: vi.fn(),
  },
  auth: {
    login: vi.fn(),
    register: vi.fn(),
    getMe: vi.fn(),
    updatePassword: vi.fn(),
  },
  products: {
    getList: vi.fn(),
    getDetail: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    getMine: vi.fn(),
  },
  orders: {
    create: vi.fn(),
    getList: vi.fn(),
    getDetail: vi.fn(),
    pay: vi.fn(),
    confirmReceived: vi.fn(),
    confirmHandoff: vi.fn(),
    cancel: vi.fn(),
    createDispute: vi.fn(),
  },
  wallet: {
    get: vi.fn(),
    recharge: vi.fn(),
  },
  favorites: {
    getList: vi.fn(),
    check: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  },
  conversations: {
    create: vi.fn(),
    getList: vi.fn(),
    getDetail: vi.fn(),
    markRead: vi.fn(),
    sendMessage: vi.fn(),
    streamUrl: vi.fn(),
  },
  disputes: {
    respond: vi.fn(),
  },
  ai: {
    productDraft: vi.fn(),
    priceSuggestion: vi.fn(),
    riskCheck: vi.fn(),
  },
  upload: {
    image: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
  useRoute: () => mocks.route,
  createRouter: vi.fn(() => ({ beforeEach: vi.fn() })),
  createWebHistory: vi.fn(),
}))

vi.mock('../src/api/index.js', () => ({
  auth: mocks.auth,
  products: mocks.products,
  orders: mocks.orders,
  wallet: mocks.wallet,
  favorites: mocks.favorites,
  conversations: mocks.conversations,
  disputes: mocks.disputes,
  ai: mocks.ai,
  upload: mocks.upload,
}))

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    ElMessage: mocks.message,
    ElMessageBox: mocks.messageBox,
  }
})

vi.mock('../src/utils/url.js', () => ({
  resolveAssetUrl: (url) => url ? `resolved:${url}` : '',
}))

const rowRenderer = (tag = 'div') => ({
  props: ['data'],
  setup(props, { slots }) {
    provide('tableData', props.data)
    return () => h(tag, slots.default?.())
  },
})

const columnRenderer = {
  setup(_props, { slots }) {
    const tableData = inject('tableData', [])
    return () => h('div', tableData.flatMap((row) => slots.default ? slots.default({ row }) : []))
  },
}

const globalStubs = {
  AppHeader: { template: '<header class="app-header-stub" />' },
  ProductCard: {
    props: ['product'],
    emits: ['edit', 'delete'],
    template: '<article class="product-card-stub"><h3>{{ product.title }}</h3><button class="edit-product" @click="$emit(\'edit\', product)">edit</button><button class="delete-product" @click="$emit(\'delete\', product)">delete</button></article>',
  },
  ImageUploader: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<div class="image-uploader-stub" />',
  },
  RouterLink: {
    props: ['to'],
    template: '<a><slot /></a>',
  },
  'el-card': { template: '<section><slot name="header" /><slot /></section>' },
  'el-button': {
    props: ['loading', 'disabled'],
    template: '<button :disabled="loading || disabled" @click="$emit(\'click\')"><slot /></button>',
  },
  'el-icon': { template: '<span><slot /></span>' },
  'el-avatar': { template: '<span><slot /></span>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-badge': { template: '<span><slot /></span>' },
  'el-empty': { template: '<div class="empty"><slot /></div>' },
  'el-tabs': { template: '<div><slot /></div>' },
  'el-tab-pane': { template: '<section><slot /></section>' },
  'el-form': {
    template: '<form><slot /></form>',
    methods: {
      validate(callback) {
        if (callback) callback(true)
        return Promise.resolve(true)
      },
    },
  },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-checkbox': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<label><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>',
  },
  'el-link': { template: '<a><slot /></a>' },
  'el-radio-group': { template: '<div><slot /></div>' },
  'el-radio-button': { template: '<button><slot /></button>' },
  'el-divider': { template: '<hr />' },
  'el-input': {
    props: ['modelValue'],
    emits: ['update:modelValue', 'keyup'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keyup="$emit(\'keyup\', $event)" />',
  },
  'el-input-number': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input class="number-input" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
  'el-select': {
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value); $emit(\'change\', $event.target.value)"><slot /></select>',
  },
  'el-option': { template: '<option />' },
  'el-pagination': {
    emits: ['current-change', 'size-change'],
    template: '<nav class="pagination" @click="$emit(\'current-change\', 2)"><slot /></nav>',
  },
  'el-table': rowRenderer('table'),
  'el-table-column': columnRenderer,
  'el-image': {
    props: ['src'],
    template: '<img :src="src" />',
  },
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
}

async function mountView(component, options = {}) {
  setActivePinia(createPinia())
  const wrapper = mount(component, {
    ...options,
    global: {
      stubs: globalStubs,
      directives: { loading: {} },
      ...(options.global || {}),
    },
  })
  await flushPromises()
  return wrapper
}

function resetMocks() {
  vi.clearAllMocks()
  localStorage.clear()
  mocks.route.params = { id: '42' }
  mocks.route.query = {}
  mocks.products.getList.mockResolvedValue({ data: { products: [], total: 0 } })
  mocks.products.getDetail.mockResolvedValue({ data: productFixture() })
  mocks.products.getMine.mockResolvedValue({ data: { products: [] } })
  mocks.products.create.mockResolvedValue({ data: { id: 55 } })
  mocks.products.remove.mockResolvedValue({ code: 200 })
  mocks.orders.create.mockResolvedValue({ data: { id: 77 } })
  mocks.orders.getList.mockResolvedValue({ data: { orders: [] } })
  mocks.orders.getDetail.mockResolvedValue({ data: orderFixture() })
  mocks.orders.pay.mockResolvedValue({ code: 200 })
  mocks.orders.confirmReceived.mockResolvedValue({ code: 200 })
  mocks.orders.confirmHandoff.mockResolvedValue({ code: 200 })
  mocks.orders.cancel.mockResolvedValue({ code: 200 })
  mocks.orders.createDispute.mockResolvedValue({ code: 200 })
  mocks.wallet.get.mockResolvedValue({ data: { balance: 0, frozenBalance: 0, transactions: [] } })
  mocks.wallet.recharge.mockResolvedValue({ data: { balance: 100, frozenBalance: 0, transactions: [] } })
  mocks.favorites.getList.mockResolvedValue({ data: { products: [] } })
  mocks.favorites.check.mockResolvedValue({ data: { favorited: false } })
  mocks.favorites.add.mockResolvedValue({ code: 200 })
  mocks.favorites.remove.mockResolvedValue({ code: 200 })
  mocks.conversations.create.mockResolvedValue({ data: { id: 88 } })
  mocks.conversations.getList.mockResolvedValue({ data: { conversations: [] } })
  mocks.conversations.getDetail.mockResolvedValue({ data: conversationFixture() })
  mocks.conversations.markRead.mockResolvedValue({ code: 200 })
  mocks.conversations.sendMessage.mockResolvedValue({ data: { id: 3, senderId: 1, type: 'text', content: 'sent' } })
  mocks.conversations.streamUrl.mockReturnValue('/stream')
  mocks.disputes.respond.mockResolvedValue({ code: 200 })
  mocks.auth.login.mockResolvedValue({ code: 200, data: { token: 'token-1' } })
  mocks.auth.register.mockResolvedValue({ code: 201, data: { id: 1 } })
  mocks.auth.getMe.mockResolvedValue({ data: { id: 1, username: 'Alice' } })
  mocks.auth.updatePassword.mockResolvedValue({ code: 200 })
  mocks.ai.productDraft.mockResolvedValue({ data: { title: 'AI title', description: 'AI desc', category: 'books', condition: 'good' } })
  mocks.ai.priceSuggestion.mockResolvedValue({ data: { fairPrice: 66 } })
  mocks.ai.riskCheck.mockResolvedValue({ data: { risky: true } })
  mocks.upload.image.mockResolvedValue({ data: { url: '/uploads/chat.png' } })
  mocks.messageBox.confirm.mockResolvedValue()
}

function productFixture(overrides = {}) {
  return {
    id: 42,
    title: 'Desk Lamp',
    description: 'Good lamp',
    price: 32,
    category: 'Life',
    condition: 'good',
    status: 'available',
    images: ['/uploads/lamp.png', '/uploads/lamp-2.png'],
    createdAt: '2026-01-01',
    seller: { id: 2, username: 'Seller', avatar: null },
    ...overrides,
  }
}

function orderFixture(overrides = {}) {
  return {
    id: 42,
    status: 'pending_payment',
    paymentExpiresAt: '2026-01-01T01:00:00Z',
    buyerHandoffConfirmed: false,
    sellerHandoffConfirmed: false,
    escrow: { amount: 32, status: 'held', paidAt: '2026-01-01T00:00:00Z' },
    product: productFixture(),
    buyer: { id: 1, username: 'Buyer' },
    seller: { id: 2, username: 'Seller' },
    disputes: [],
    ...overrides,
  }
}

function conversationFixture() {
  return {
    conversation: {
      id: 3,
      peer: { id: 2, username: 'Seller' },
      product: productFixture(),
    },
    messages: [
      { id: 1, senderId: 2, type: 'text', content: 'hello', sender: { username: 'Seller' }, createdAt: '2026-01-01' },
      { id: 2, senderId: null, type: 'system', content: 'system', createdAt: '2026-01-01' },
    ],
  }
}

beforeEach(() => {
  resetMocks()
})

describe('real source component coverage', () => {
  it('renders ProductCard data and emits actions', async () => {
    const ProductCard = (await import('../src/components/ProductCard.vue')).default
    const wrapper = await mountView(ProductCard, {
      props: {
        product: productFixture(),
        showActions: true,
      },
    })

    expect(wrapper.text()).toContain('Desk Lamp')
    expect(wrapper.find('img').attributes('src')).toBe('resolved:/uploads/lamp.png')

    await wrapper.find('.product-card').trigger('click')
    expect(mocks.router.push).toHaveBeenCalledWith('/product/42')

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('edit')[0][0].id).toBe(42)
    expect(wrapper.emitted('delete')[0][0].id).toBe(42)
  })

  it('validates ImageUploader files and emits uploaded urls', async () => {
    const ImageUploader = (await import('../src/components/ImageUploader.vue')).default
    const UploadStub = {
      props: ['fileList', 'beforeUpload', 'onSuccess', 'onError', 'onRemove', 'onExceed', 'action', 'headers'],
      template: '<div class="upload-stub"><slot /></div>',
    }

    localStorage.setItem('token', 'jwt-token')
    const wrapper = shallowMount(ImageUploader, {
      props: { modelValue: ['/uploads/a.png'], maxSize: 1 },
      global: {
        stubs: {
          'el-upload': UploadStub,
          'el-icon': globalStubs['el-icon'],
        },
      },
    })

    const uploadProps = wrapper.findComponent(UploadStub).props()
    expect(uploadProps.action).toContain('/upload/image')
    expect(uploadProps.headers.Authorization).toBe('Bearer jwt-token')
    expect(uploadProps.beforeUpload({ type: 'text/plain', size: 1 })).toBe(false)
    expect(uploadProps.beforeUpload({ type: 'image/png', size: 2 * 1024 * 1024 })).toBe(false)
    expect(uploadProps.beforeUpload({ type: 'image/png', size: 100 })).toBe(true)

    const fileList = [{ uid: 1, status: 'success', url: '' }]
    uploadProps.onSuccess({ code: 200, data: { url: '/uploads/new.png' } }, { uid: 1 }, fileList)
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toEqual(['resolved:/uploads/new.png'])

    uploadProps.onRemove({}, [{ status: 'success', url: '/uploads/left.png' }])
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toEqual(['/uploads/left.png'])
  }, 10000)

  it('drives AppHeader search, commands, logout, and unread count', async () => {
    const AppHeader = (await import('../src/components/AppHeader.vue')).default
    const { useUserStore } = await import('../src/stores/user.js')
    setActivePinia(createPinia())
    const store = useUserStore()
    store.setToken('jwt-token')
    store.userInfo = { id: 1, username: 'Admin', role: 'admin' }
    mocks.conversations.getList.mockResolvedValue({ data: { conversations: [{ unreadCount: 2 }, { unreadCount: 3 }] } })

    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          ...globalStubs,
          'el-dropdown': { template: '<div><slot /><slot name="dropdown" /></div>' },
          'el-dropdown-menu': { template: '<div><slot /></div>' },
          'el-dropdown-item': { props: ['command'], template: '<button><slot /></button>' },
        },
      },
    })
    await flushPromises()

    expect(wrapper.vm.unreadMessageCount).toBe(5)
    wrapper.vm.searchKeyword = '  lamp  '
    wrapper.vm.handleSearch()
    expect(mocks.router.push).toHaveBeenCalledWith({ path: '/', query: { search: 'lamp' } })

    wrapper.vm.handleCommand('admin')
    wrapper.vm.handleCommand('messages')
    expect(mocks.router.push).toHaveBeenCalledWith('/admin')
    expect(mocks.router.push).toHaveBeenCalledWith('/messages')

    wrapper.vm.handleCommand('logout')
    expect(localStorage.getItem('token')).toBeNull()
    expect(mocks.message.success).toHaveBeenCalled()
  })
})

describe('view coverage', () => {
  it('runs login and registration flows', async () => {
    const LoginView = (await import('../src/views/LoginView.vue')).default
    mocks.route.query = { redirect: '/publish' }
    const wrapper = await mountView(LoginView)

    wrapper.vm.loginForm.username = 'user@example.com'
    wrapper.vm.loginForm.password = 'Password123!'
    await wrapper.vm.handleLogin()
    await flushPromises()

    expect(mocks.auth.login).toHaveBeenCalledWith({ username: 'user@example.com', password: 'Password123!' })
    expect(mocks.router.push).toHaveBeenCalledWith('/publish')

    wrapper.vm.registerForm.username = 'newuser'
    wrapper.vm.registerForm.email = 'new@example.com'
    wrapper.vm.registerForm.password = 'Password123!'
    wrapper.vm.registerForm.confirmPassword = 'Password123!'
    await wrapper.vm.handleRegister()
    await flushPromises()

    expect(mocks.auth.register).toHaveBeenCalledWith({ username: 'newuser', email: 'new@example.com', password: 'Password123!' })
    expect(wrapper.vm.activeTab).toBe('login')
  })

  it('runs publish AI and submit flows', async () => {
    const PublishView = (await import('../src/views/PublishView.vue')).default
    const wrapper = await mountView(PublishView)

    await wrapper.vm.handleAiDraft()
    expect(wrapper.vm.form.title).toBe('AI title')

    await wrapper.vm.handlePriceSuggestion()
    expect(wrapper.vm.form.price).toBe(66)

    wrapper.vm.form.title = 'Desk Lamp'
    wrapper.vm.form.category = 'Life'
    wrapper.vm.form.condition = 'good'
    wrapper.vm.form.description = 'Nice'
    wrapper.vm.form.images = ['/uploads/a.png']
    await wrapper.vm.handleSubmit()
    await flushPromises()

    expect(mocks.products.create).toHaveBeenCalledWith({
      title: 'Desk Lamp',
      price: 66,
      category: 'Life',
      condition: 'good',
      description: 'Nice',
      images: ['/uploads/a.png'],
    })
    expect(mocks.router.push).toHaveBeenCalledWith('/product/55')

    wrapper.vm.handleCancel()
    expect(mocks.router.back).toHaveBeenCalled()
  })

  it('runs HomeView load, filtering, and pagination flows', async () => {
    const HomeView = (await import('../src/views/HomeView.vue')).default
    mocks.products.getList.mockResolvedValue({ data: { products: [productFixture()], total: 1 } })
    mocks.route.query = { search: 'lamp' }
    window.scrollTo = vi.fn()

    const wrapper = await mountView(HomeView)

    expect(mocks.products.getList).toHaveBeenCalledWith(expect.objectContaining({ search: 'lamp', status: 'available' }))
    wrapper.vm.filters.sortBy = 'price_asc'
    wrapper.vm.handleFilterChange()
    await flushPromises()
    expect(mocks.products.getList).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'price', sortOrder: 'asc' }))

    wrapper.vm.handlePageChange(2)
    await flushPromises()
    expect(window.scrollTo).toHaveBeenCalled()

    wrapper.vm.handleSizeChange(24)
    await flushPromises()
    expect(wrapper.vm.pagination.pageSize).toBe(24)
  })

  it('runs ProductDetailView buyer, favorite, contact, and owner actions', async () => {
    const ProductDetailView = (await import('../src/views/ProductDetailView.vue')).default
    const { useUserStore } = await import('../src/stores/user.js')
    const wrapper = await mountView(ProductDetailView)
    await flushPromises()

    expect(mocks.products.getDetail).toHaveBeenCalledWith('42')
    await wrapper.vm.handleBuy()
    expect(mocks.router.push).toHaveBeenCalledWith('/login')

    const store = useUserStore()
    store.setToken('jwt-token')
    store.userInfo = { id: 1, username: 'Buyer' }
    await wrapper.vm.handleBuy()
    expect(mocks.orders.create).toHaveBeenCalledWith({ productId: 42 })
    expect(mocks.router.push).toHaveBeenCalledWith('/orders/77')

    await wrapper.vm.handleContactSeller()
    expect(mocks.conversations.create).toHaveBeenCalledWith({ productId: 42 })
    expect(mocks.router.push).toHaveBeenCalledWith('/messages/88')

    await wrapper.vm.handleToggleFavorite()
    expect(mocks.favorites.add).toHaveBeenCalledWith(42)
    await wrapper.vm.handleToggleFavorite()
    expect(mocks.favorites.remove).toHaveBeenCalledWith(42)

    store.userInfo = { id: 2, username: 'Seller' }
    await nextTick()
    wrapper.vm.handleEdit()
    expect(mocks.router.push).toHaveBeenCalledWith('/product/42/edit')
    await wrapper.vm.handleDelete()
    expect(mocks.products.remove).toHaveBeenCalledWith(42)
  })

  it('runs OrderDetailView payment, handoff, dispute, and messaging flows', async () => {
    const OrderDetailView = (await import('../src/views/OrderDetailView.vue')).default
    const { useUserStore } = await import('../src/stores/user.js')
    mocks.orders.getDetail.mockResolvedValue({ data: orderFixture() })

    const wrapper = await mountView(OrderDetailView)
    await flushPromises()

    const store = useUserStore()
    store.userInfo = { id: 1, username: 'Buyer' }
    await wrapper.vm.handlePay()
    await flushPromises()
    expect(mocks.orders.pay).toHaveBeenCalledWith(42)

    wrapper.vm.order.status = 'paid_escrow'
    await wrapper.vm.handleConfirmReceived()
    await flushPromises()
    expect(mocks.orders.confirmReceived).toHaveBeenCalledWith(42)

    store.userInfo = { id: 2, username: 'Seller' }
    await wrapper.vm.handleConfirmHandoff()
    await flushPromises()
    expect(mocks.orders.confirmHandoff).toHaveBeenCalledWith(42)

    wrapper.vm.order.status = 'pending_payment'
    await wrapper.vm.handleCancel()
    await flushPromises()
    expect(mocks.orders.cancel).toHaveBeenCalledWith(42)

    wrapper.vm.order.status = 'paid_escrow'
    wrapper.vm.disputeReason = 'Not as described'
    await wrapper.vm.handleCreateDispute()
    await flushPromises()
    expect(mocks.orders.createDispute).toHaveBeenCalledWith(42, { reason: 'Not as described', evidenceImages: [] })

    wrapper.vm.order.disputes = [{ id: 9, status: 'open', response: '', responseImages: [] }]
    wrapper.vm.disputeResponse = 'Seller response'
    await wrapper.vm.handleRespondDispute()
    await flushPromises()
    expect(mocks.disputes.respond).toHaveBeenCalledWith(9, { response: 'Seller response', responseImages: [] })

    store.userInfo = { id: 1, username: 'Buyer' }
    await wrapper.vm.goMessages()
    await flushPromises()
    expect(mocks.conversations.create).toHaveBeenCalledWith({ productId: 42 })
  })

  it('runs WalletView load and recharge flows', async () => {
    const WalletView = (await import('../src/views/WalletView.vue')).default
    mocks.wallet.get.mockResolvedValue({ data: { balance: 12.3, frozenBalance: 0, transactions: [{ id: 1, type: 'recharge', direction: 'in', amount: 12.3, note: 'top up' }] } })
    mocks.wallet.recharge.mockResolvedValue({ data: { balance: 112.3, frozenBalance: 0, transactions: [] } })

    const wrapper = await mountView(WalletView)

    expect(wrapper.vm.walletData.balance).toBe(12.3)
    wrapper.vm.amount = 100
    await wrapper.vm.handleRecharge()
    expect(mocks.wallet.recharge).toHaveBeenCalledWith({ amount: 100 })
    expect(wrapper.vm.walletData.balance).toBe(112.3)
    expect(wrapper.vm.formatMoney('bad')).toBe('0.00')
    expect(wrapper.vm.typeText('refund')).not.toBe('refund')
  })

  it('loads list-oriented views and handles actions', async () => {
    const FavoritesView = (await import('../src/views/FavoritesView.vue')).default
    const MyProductsView = (await import('../src/views/MyProductsView.vue')).default
    const ConversationListView = (await import('../src/views/ConversationListView.vue')).default
    const OrderListView = (await import('../src/views/OrderListView.vue')).default

    mocks.favorites.getList.mockResolvedValue({ data: { products: [productFixture({ id: 1 })] } })
    const favoritesWrapper = await mountView(FavoritesView)
    expect(favoritesWrapper.vm.productList).toHaveLength(1)

    mocks.products.getMine.mockResolvedValue({ data: { products: [productFixture({ id: 5 })] } })
    const mineWrapper = await mountView(MyProductsView)
    mineWrapper.vm.handleEdit({ id: 5 })
    expect(mocks.router.push).toHaveBeenCalledWith('/product/5/edit')
    await mineWrapper.vm.handleDelete({ id: 5, title: 'Desk Lamp' })
    expect(mocks.products.remove).toHaveBeenCalledWith(5)

    mocks.conversations.getList.mockResolvedValue({ data: { conversations: [{ id: 6, peer: { username: 'Seller' }, product: productFixture(), unreadCount: 1, lastMessage: 'hello', updatedAt: '2026-01-01' }] } })
    const conversationsWrapper = await mountView(ConversationListView)
    expect(conversationsWrapper.vm.conversationList).toHaveLength(1)

    mocks.orders.getList.mockResolvedValue({ data: { orders: [orderFixture({ id: 7 })] } })
    const ordersWrapper = await mountView(OrderListView)
    ordersWrapper.vm.goOrderDetail({ id: 7 })
    expect(mocks.router.push).toHaveBeenCalledWith('/orders/7')
    expect(ordersWrapper.vm.statusText('completed')).not.toBe('completed')
  })

  it('runs ProfileView product, order, password, and logout flows', async () => {
    const ProfileView = (await import('../src/views/ProfileView.vue')).default
    const { useUserStore } = await import('../src/stores/user.js')
    const store = useUserStore()
    store.userInfo = { id: 1, username: 'Buyer', email: 'buyer@example.com' }
    mocks.products.getMine.mockResolvedValue({ data: { products: [productFixture({ id: 3 })] } })
    mocks.orders.getList.mockResolvedValue({ data: { orders: [orderFixture({ id: 4 })] } })

    const wrapper = await mountView(ProfileView)
    expect(wrapper.vm.myProducts).toHaveLength(1)
    expect(wrapper.vm.myOrders).toHaveLength(1)

    wrapper.vm.handleEditProduct({ id: 3 })
    expect(mocks.router.push).toHaveBeenCalledWith('/product/3/edit')

    await wrapper.vm.handleDeleteProduct({ id: 3, title: 'Desk Lamp' })
    expect(mocks.products.remove).toHaveBeenCalledWith(3)

    wrapper.vm.passwordForm.oldPassword = 'old'
    wrapper.vm.passwordForm.newPassword = 'new'
    wrapper.vm.passwordForm.confirmPassword = 'new'
    await wrapper.vm.handleUpdatePassword()
    expect(mocks.auth.updatePassword).toHaveBeenCalledWith({ oldPassword: 'old', newPassword: 'new' })

    await wrapper.vm.handleLogout()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('runs ConversationDetailView messaging, image upload, and stream cleanup', async () => {
    const close = vi.fn()
    const listeners = {}
    vi.stubGlobal('EventSource', vi.fn(() => ({
      addEventListener: vi.fn((name, callback) => { listeners[name] = callback }),
      close,
    })))

    const ConversationDetailView = (await import('../src/views/ConversationDetailView.vue')).default
    const { useUserStore } = await import('../src/stores/user.js')
    const store = useUserStore()
    store.setToken('jwt-token')
    store.userInfo = { id: 1, username: 'Buyer' }

    const wrapper = await mountView(ConversationDetailView)
    expect(mocks.conversations.getDetail).toHaveBeenCalledWith('42')
    expect(mocks.conversations.markRead).toHaveBeenCalledWith('42')

    listeners.message({ data: JSON.stringify({ id: 99, senderId: 2, type: 'text', content: 'streamed' }) })
    expect(wrapper.vm.messageList.some((message) => message.id === 99)).toBe(true)

    wrapper.vm.messageText = 'pay outside platform'
    await wrapper.vm.handleSend()
    await flushPromises()
    expect(mocks.conversations.sendMessage).toHaveBeenCalledWith('42', { type: 'text', content: 'pay outside platform' })
    expect(wrapper.vm.riskHint).not.toBe('')

    const file = new File(['x'], 'proof.png', { type: 'image/png' })
    await wrapper.vm.handleImageSelected({ target: { files: [file], value: 'x' } })
    expect(mocks.upload.image).toHaveBeenCalled()
    expect(mocks.conversations.sendMessage).toHaveBeenCalledWith('42', {
      type: 'image',
      content: '/uploads/chat.png',
      metadata: { filename: 'proof.png' },
    })

    wrapper.unmount()
    expect(close).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
