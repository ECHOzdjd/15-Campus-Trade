import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../src/utils/request.js', () => ({
  default: request,
}))

describe('api index wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps auth and product calls to request utility', async () => {
    const { auth, products } = await import('../src/api/index.js')

    auth.register({ email: 'a@example.com' })
    auth.login({ username: 'alice' })
    auth.getMe()
    auth.updatePassword({ oldPassword: 'old', newPassword: 'new' })
    products.getList({ page: 1 })
    products.getDetail(7)
    products.create({ title: 'Lamp' })
    products.update(7, { title: 'New' })
    products.remove(7)
    products.getMine()

    expect(request.post).toHaveBeenCalledWith('/auth/register', { email: 'a@example.com' })
    expect(request.post).toHaveBeenCalledWith('/auth/login', { username: 'alice' })
    expect(request.get).toHaveBeenCalledWith('/auth/me')
    expect(request.put).toHaveBeenCalledWith('/auth/password', { oldPassword: 'old', newPassword: 'new' })
    expect(request.get).toHaveBeenCalledWith('/products', { params: { page: 1 } })
    expect(request.get).toHaveBeenCalledWith('/products/7')
    expect(request.post).toHaveBeenCalledWith('/products', { title: 'Lamp' })
    expect(request.put).toHaveBeenCalledWith('/products/7', { title: 'New' })
    expect(request.delete).toHaveBeenCalledWith('/products/7')
    expect(request.get).toHaveBeenCalledWith('/products/my', { params: {} })
  })

  it('maps order, wallet, dispute, admin, upload, and ai calls', async () => {
    const { orders, wallet, disputes, admin, upload, ai } = await import('../src/api/index.js')
    const formData = new FormData()

    orders.create({ productId: 1 })
    orders.getList()
    orders.getDetail(2)
    orders.pay(2)
    orders.confirmReceived(2)
    orders.confirmHandoff(2)
    orders.requestRelease(2, { reason: 'done' })
    orders.createDispute(2, { reason: 'bad' })
    orders.confirm(2)
    orders.cancel(2)
    wallet.get()
    wallet.recharge({ amount: 10 })
    disputes.respond(3, { response: 'ok' })
    disputes.resolve(3, { result: 'buyer' })
    admin.getProducts()
    admin.removeProduct(4)
    admin.getDisputes()
    upload.image(formData)
    ai.productDraft({ title: 'draft' })
    ai.priceSuggestion({ title: 'draft' })
    ai.riskCheck({ content: 'risk' })

    expect(request.post).toHaveBeenCalledWith('/orders', { productId: 1 })
    expect(request.get).toHaveBeenCalledWith('/orders', { params: {} })
    expect(request.get).toHaveBeenCalledWith('/orders/2')
    expect(request.post).toHaveBeenCalledWith('/orders/2/pay')
    expect(request.post).toHaveBeenCalledWith('/orders/2/confirm-received')
    expect(request.post).toHaveBeenCalledWith('/orders/2/confirm-handoff')
    expect(request.post).toHaveBeenCalledWith('/orders/2/request-release', { reason: 'done' })
    expect(request.post).toHaveBeenCalledWith('/orders/2/disputes', { reason: 'bad' })
    expect(request.put).toHaveBeenCalledWith('/orders/2/confirm', {})
    expect(request.put).toHaveBeenCalledWith('/orders/2/cancel', {})
    expect(request.get).toHaveBeenCalledWith('/wallet')
    expect(request.post).toHaveBeenCalledWith('/wallet/recharge', { amount: 10 })
    expect(request.post).toHaveBeenCalledWith('/disputes/3/respond', { response: 'ok' })
    expect(request.post).toHaveBeenCalledWith('/disputes/3/resolve', { result: 'buyer' })
    expect(request.get).toHaveBeenCalledWith('/admin/products', { params: {} })
    expect(request.delete).toHaveBeenCalledWith('/admin/products/4')
    expect(request.get).toHaveBeenCalledWith('/admin/disputes', { params: {} })
    expect(request.post).toHaveBeenCalledWith('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    expect(request.post).toHaveBeenCalledWith('/ai/product-draft', { title: 'draft' })
    expect(request.post).toHaveBeenCalledWith('/ai/price-suggestion', { title: 'draft' })
    expect(request.post).toHaveBeenCalledWith('/ai/risk-check', { content: 'risk' })
  })

  it('builds conversation stream urls with encoded token and default export groups', async () => {
    const api = await import('../src/api/index.js')

    api.conversations.create({ productId: 1 })
    api.conversations.getList()
    api.conversations.getDetail(5)
    api.conversations.sendMessage(5, { content: 'hello' })
    api.conversations.markRead(5)
    api.favorites.getList()
    api.favorites.check(9)
    api.favorites.add(9)
    api.favorites.remove(9)

    expect(request.post).toHaveBeenCalledWith('/conversations', { productId: 1 })
    expect(request.get).toHaveBeenCalledWith('/conversations')
    expect(request.get).toHaveBeenCalledWith('/conversations/5')
    expect(request.post).toHaveBeenCalledWith('/conversations/5/messages', { content: 'hello' })
    expect(request.put).toHaveBeenCalledWith('/conversations/5/read')
    expect(api.conversations.streamUrl(5, 'a b+c')).toBe('http://localhost:3001/api/conversations/5/stream?token=a%20b%2Bc')
    expect(request.get).toHaveBeenCalledWith('/favorites')
    expect(request.get).toHaveBeenCalledWith('/favorites/9')
    expect(request.post).toHaveBeenCalledWith('/favorites/9')
    expect(request.delete).toHaveBeenCalledWith('/favorites/9')
    expect(api.default.products).toBe(api.products)
  })
})
