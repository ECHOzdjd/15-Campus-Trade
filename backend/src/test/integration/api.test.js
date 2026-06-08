const request = require('supertest')
const app = require('../../app')
const pool = require('../../config/db')
const ensureRuntimeSchema = require('../../config/ensureSchema')

async function registerUser(prefix) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 100000)}`
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      username: `${prefix}${stamp}`,
      email: `${prefix}${stamp}@example.com`,
      password: 'Password123!'
    })

  expect(response.status).toBe(201)
  return {
    token: response.body.data.token,
    user: response.body.data.user
  }
}

async function registerAdmin(prefix) {
  const admin = await registerUser(prefix)

  await pool.query('UPDATE users SET role = ? WHERE id = ?', ['admin', admin.user.id])

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      email: admin.user.email,
      password: 'Password123!'
    })

  expect(loginResponse.status).toBe(200)
  return {
    token: loginResponse.body.data.token,
    user: loginResponse.body.data.user
  }
}

async function createProduct(token, overrides = {}) {
  const response = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: `Test API Product ${Date.now()}${Math.floor(Math.random() * 100000)}`,
      price: 88,
      category: 'Books',
      condition: 'good',
      description: '',
      images: [],
      ...overrides
    })

  expect(response.status).toBe(201)
  return response.body.data
}

// 清理测试数据
afterAll(async () => {
  // 清理测试创建的用户和商品
  await pool.query('DELETE d FROM disputes d INNER JOIN orders o ON d.order_id = o.id INNER JOIN products p ON o.product_id = p.id WHERE p.title LIKE \'Test%API%\'')
  await pool.query('DELETE d FROM disputes d INNER JOIN orders o ON d.order_id = o.id INNER JOIN users buyer ON o.buyer_id = buyer.id INNER JOIN users seller ON o.seller_id = seller.id WHERE buyer.email LIKE \'dispute%@example.com\' OR seller.email LIKE \'dispute%@example.com\'')
  await pool.query('DELETE e FROM payment_escrows e INNER JOIN orders o ON e.order_id = o.id INNER JOIN products p ON o.product_id = p.id WHERE p.title LIKE \'Test%API%\'')
  await pool.query('DELETE e FROM payment_escrows e INNER JOIN orders o ON e.order_id = o.id INNER JOIN users buyer ON o.buyer_id = buyer.id INNER JOIN users seller ON o.seller_id = seller.id WHERE buyer.email LIKE \'dispute%@example.com\' OR seller.email LIKE \'dispute%@example.com\'')
  await pool.query('DELETE wt FROM wallet_transactions wt INNER JOIN users u ON wt.user_id = u.id WHERE u.email LIKE \'test%api%\' OR u.email LIKE \'logintest%@example.com\' OR u.email LIKE \'payflow%@example.com\' OR u.email LIKE \'insufficient%@example.com\' OR u.email LIKE \'dispute%@example.com\'')
  await pool.query('DELETE w FROM wallets w INNER JOIN users u ON w.user_id = u.id WHERE u.email LIKE \'test%api%\' OR u.email LIKE \'logintest%@example.com\' OR u.email LIKE \'payflow%@example.com\' OR u.email LIKE \'insufficient%@example.com\' OR u.email LIKE \'dispute%@example.com\'')
  await pool.query('DELETE o FROM orders o INNER JOIN users buyer ON o.buyer_id = buyer.id INNER JOIN users seller ON o.seller_id = seller.id WHERE buyer.email LIKE \'dispute%@example.com\' OR seller.email LIKE \'dispute%@example.com\'')
  await pool.query('DELETE o FROM orders o INNER JOIN products p ON o.product_id = p.id WHERE p.title LIKE \'Test%API%\'')
  await pool.query('DELETE FROM products WHERE title LIKE \'Test%API%\'')
  await pool.query('DELETE FROM users WHERE email LIKE \'test%api%\' OR email LIKE \'logintest%@example.com\' OR email LIKE \'payflow%@example.com\' OR email LIKE \'insufficient%@example.com\' OR email LIKE \'dispute%@example.com\'')
  await pool.end()
})

describe('API Integration Tests', () => {
  let testToken
  let testUserId
  let testProductId
  let buyerToken
  let conversationId

  // 测试1: 注册新用户 - 成功
  test('POST /api/auth/register - should register new user successfully', async () => {
    const uniqueEmail = `testapi${Date.now()}@example.com`
    const uniqueUsername = `testapi${Date.now()}`

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: uniqueUsername,
        email: uniqueEmail,
        password: 'Password123!'
      })

    expect(response.status).toBe(201)
    expect(response.body.code).toBe(201)
    expect(response.body.data.token).toBeDefined()
    expect(response.body.data.user.email).toBe(uniqueEmail)
    expect(response.body.data.user.role).toBe('user')

    testToken = response.body.data.token
    testUserId = response.body.data.user.id
  })

  // 测试2: 注册 - 缺少必填字段
  test('POST /api/auth/register - should fail with missing fields', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'incomplete@example.com'
      })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe(400)
    expect(response.body.message).toContain('不能为空')
  })

  // 测试3: 注册 - 密码强度不足
  test('POST /api/auth/register - should fail with weak password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'weakpassuser',
        email: `weak${Date.now()}@example.com`,
        password: '123'  // 太弱
      })

    expect(response.status).toBe(400)
    expect(response.body.message).toContain('密码')
  })

  // 测试4: 登录 - 成功
  test('POST /api/auth/login - should login successfully', async () => {
    // 使用之前注册的用户
    const uniqueEmail = `logintest${Date.now()}@example.com`
    await request(app)
      .post('/api/auth/register')
      .send({
        username: `loginuser${Date.now()}`,
        email: uniqueEmail,
        password: 'Password123!'
      })

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        password: 'Password123!'
      })

    expect(response.status).toBe(200)
    expect(response.body.data.token).toBeDefined()
    expect(response.body.data.user.email).toBe(uniqueEmail)
  })

  // 测试5: 登录 - 密码错误
  test('POST /api/auth/login - should fail with wrong password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'WrongPassword123!'
      })

    expect(response.status).toBe(401)
    expect(response.body.code).toBe(401)
  })

  // 测试6: 获取商品列表
  test('GET /api/products - should return products list', async () => {
    const response = await request(app)
      .get('/api/products')
      .query({ page: 1, pageSize: 10 })

    expect(response.status).toBe(200)
    expect(response.body.code).toBe(200)
    expect(response.body.data.products).toBeDefined()
    expect(Array.isArray(response.body.data.products)).toBe(true)
    expect(response.body.data.page).toBe(1)
  })

  // 测试7: 获取当前用户信息 - 需要 Token
  test('GET /api/auth/me - should return user info with valid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${testToken}`)

    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe(testUserId)
    expect(response.body.data.role).toBe('user')
  })

  // 测试8: 获取用户信息 - 无 Token
  test('GET /api/auth/me - should fail without token', async () => {
    const response = await request(app)
      .get('/api/auth/me')

    expect(response.status).toBe(401)
    expect(response.body.code).toBe(401)
  })

  test('POST /api/ai/product-draft - should build campus trade draft', async () => {
    const response = await request(app)
      .post('/api/ai/product-draft')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ title: '  高数教材  ', condition: 'like_new' })

    expect(response.status).toBe(200)
    expect(response.body.data.title).toBe('高数教材 校园面交')
    expect(response.body.data.category).toBe('二手好物')
    expect(response.body.data.description).toContain('几乎全新')
  })

  test('POST /api/ai/product-draft - should return defaults for empty body', async () => {
    const response = await request(app)
      .post('/api/ai/product-draft')
      .set('Authorization', `Bearer ${testToken}`)
      .send({})

    expect(response.status).toBe(200)
    expect(response.body.data.title).toBe('二手好物 校园面交')
    expect(response.body.data.category).toBe('二手好物')
    expect(response.body.data.condition).toBe('good')
  })

  test('POST /api/ai/price-suggestion - should return numeric price suggestions', async () => {
    const response = await request(app)
      .post('/api/ai/price-suggestion')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ originalPrice: 100, condition: 'good' })

    expect(response.status).toBe(200)
    expect(typeof response.body.data.quickSalePrice).toBe('number')
    expect(typeof response.body.data.fairPrice).toBe('number')
    expect(typeof response.body.data.highDisplayPrice).toBe('number')
  })

  test('POST /api/ai/price-suggestion - should handle malformed price input', async () => {
    const response = await request(app)
      .post('/api/ai/price-suggestion')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ price: 'abc' })

    expect(response.status).toBe(200)
    expect(typeof response.body.data.quickSalePrice).toBe('number')
    expect(typeof response.body.data.fairPrice).toBe('number')
    expect(typeof response.body.data.highDisplayPrice).toBe('number')
  })

  test('POST /api/ai/risk-check - should fail without token', async () => {
    const response = await request(app)
      .post('/api/ai/risk-check')
      .send({ content: '不走平台' })

    expect(response.status).toBe(401)
  })

  // 测试9: 创建商品 - 成功
  test('POST /api/products - should create product with valid token', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        title: 'Test Product for API',
        price: 99.99,
        category: 'Electronics',
        condition: 'new',
        description: 'A test product description',
        images: []
      })

    expect(response.status).toBe(201)
    expect(response.body.data.title).toBe('Test Product for API')
    testProductId = response.body.data.id
  })

  // 测试10: 创建商品 - 无 Token
  test('POST /api/products - should fail without token', async () => {
    const response = await request(app)
      .post('/api/products')
      .send({
        title: 'Unauthorized Product',
        price: 50,
        category: 'Books',
        condition: 'good'
      })

    expect(response.status).toBe(401)
  })

  // 测试11: 获取商品详情 - 成功
  test('GET /api/products/:id - should return product detail', async () => {
    const response = await request(app)
      .get(`/api/products/${testProductId}`)

    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe(testProductId)
  })

  // 测试12: 获取商品详情 - 不存在
  test('GET /api/products/:id - should return 404 for non-existent product', async () => {
    const response = await request(app)
      .get('/api/products/999999')

    expect(response.status).toBe(404)
    expect(response.body.code).toBe(404)
  })

  test('POST /api/conversations - buyer should contact seller before trade', async () => {
    const uniqueEmail = `testbuyerapi${Date.now()}@example.com`
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: `testbuyerapi${Date.now()}`,
        email: uniqueEmail,
        password: 'Password123!'
      })

    buyerToken = registerResponse.body.data.token

    const response = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ productId: testProductId })

    expect(response.status).toBe(201)
    expect(response.body.data.product.id).toBe(testProductId)
    conversationId = response.body.data.id
  })

  test('POST /api/ai/risk-check - should detect off-platform payment words', async () => {
    const response = await request(app)
      .post('/api/ai/risk-check')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ content: '我们不走平台，扫码付款可以吗' })

    expect(response.status).toBe(200)
    expect(response.body.data.risky).toBe(true)
    expect(response.body.data.keywords.length).toBeGreaterThan(0)
  })

  test('POST /api/conversations/:id/messages - should send campus handoff message', async () => {
    const response = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ content: '今晚图书馆门口可以面交吗？' })

    expect(response.status).toBe(201)
    expect(response.body.data.type).toBe('text')
    expect(response.body.data.content).toBe('今晚图书馆门口可以面交吗？')
  })

  test('POST /api/conversations/:id/messages - should send image message', async () => {
    const response = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        type: 'image',
        content: '/uploads/test-chat-proof.PNG',
        metadata: { filename: 'test-chat-proof.PNG' }
      })

    expect(response.status).toBe(201)
    expect(response.body.data.type).toBe('image')
    expect(response.body.data.content).toBe('/uploads/test-chat-proof.PNG')
    expect(response.body.data.metadata.filename).toBe('test-chat-proof.PNG')
  })

  test.each([
    '/uploads/../x.png',
    '/uploads/not-image.txt',
    '/uploads/a%2fb.png',
    '/uploads/a%5cb.png'
  ])('POST /api/conversations/:id/messages - should reject invalid image path %s', async (content) => {
    const response = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ type: 'image', content })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('图片消息必须来自上传接口')
  })

  test('POST /api/conversations/:id/messages - should reject client system message', async () => {
    const response = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ type: 'system', content: '订单已创建' })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('消息类型不支持')
  })

  test('POST /api/conversations/:id/messages - should reject non-string content', async () => {
    const response = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ type: 'text', content: { text: 'hello' } })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('消息内容不能为空')
  })

  test('GET /api/conversations - should list user conversations', async () => {
    const response = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${buyerToken}`)

    expect(response.status).toBe(200)
    expect(response.body.data.conversations.length).toBeGreaterThan(0)
  })

  test('POST and DELETE /api/favorites/:productId - should toggle favorite', async () => {
    const addResponse = await request(app)
      .post(`/api/favorites/${testProductId}`)
      .set('Authorization', `Bearer ${buyerToken}`)

    expect(addResponse.status).toBe(201)
    expect(addResponse.body.data.favorited).toBe(true)

    const checkResponse = await request(app)
      .get(`/api/favorites/${testProductId}`)
      .set('Authorization', `Bearer ${buyerToken}`)

    expect(checkResponse.status).toBe(200)
    expect(checkResponse.body.data.favorited).toBe(true)

    const removeResponse = await request(app)
      .delete(`/api/favorites/${testProductId}`)
      .set('Authorization', `Bearer ${buyerToken}`)

    expect(removeResponse.status).toBe(200)
    expect(removeResponse.body.data.favorited).toBe(false)
  })

  test('POST /api/orders - should create a conversation for direct purchase', async () => {
    const sellerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: `testdirectsellerapi${Date.now()}`,
        email: `testdirectsellerapi${Date.now()}@example.com`,
        password: 'Password123!'
      })
    const directSellerToken = sellerResponse.body.data.token

    const buyerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: `testdirectbuyerapi${Date.now()}`,
        email: `testdirectbuyerapi${Date.now()}@example.com`,
        password: 'Password123!'
      })
    const directBuyerToken = buyerResponse.body.data.token

    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${directSellerToken}`)
      .send({
        title: `Test API Direct Purchase ${Date.now()}`,
        price: 88,
        category: 'Books',
        condition: 'good',
        description: '',
        images: []
      })

    expect(productResponse.status).toBe(201)
    const directProductId = productResponse.body.data.id

    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${directBuyerToken}`)
      .send({ productId: directProductId })

    expect(orderResponse.status).toBe(201)

    const buyerConversations = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${directBuyerToken}`)

    expect(buyerConversations.status).toBe(200)
    expect(
      buyerConversations.body.data.conversations.some(item => item.product.id === directProductId)
    ).toBe(true)

    const sellerConversations = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${directSellerToken}`)

    expect(sellerConversations.status).toBe(200)
    expect(
      sellerConversations.body.data.conversations.some(item => item.product.id === directProductId)
    ).toBe(true)

    await pool.query('DELETE FROM conversations WHERE product_id = ?', [directProductId])
    await ensureRuntimeSchema()

    const backfilledConversations = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${directSellerToken}`)

    expect(backfilledConversations.status).toBe(200)
    expect(
      backfilledConversations.body.data.conversations.some(item => item.product.id === directProductId)
    ).toBe(true)
  })

  test('escrow payment flow should complete after both handoff confirmations', async () => {
    const seller = await registerUser('payflowSeller')
    const buyer = await registerUser('payflowBuyer')
    const product = await createProduct(seller.token, { price: 66 })

    const rechargeResponse = await request(app)
      .post('/api/wallet/recharge')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ amount: 100 })

    expect(rechargeResponse.status).toBe(200)
    expect(rechargeResponse.body.data.balance).toBe(100)

    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId: product.id })

    expect(orderResponse.status).toBe(201)
    expect(orderResponse.body.data.status).toBe('pending_payment')

    const payResponse = await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/pay`)
      .set('Authorization', `Bearer ${buyer.token}`)

    expect(payResponse.status).toBe(200)
    expect(payResponse.body.data.status).toBe('paid_escrow')
    expect(payResponse.body.data.escrow.status).toBe('held')

    const sellerConfirmResponse = await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/confirm-handoff`)
      .set('Authorization', `Bearer ${seller.token}`)

    expect(sellerConfirmResponse.status).toBe(200)
    expect(sellerConfirmResponse.body.data.status).toBe('meeting_confirmed')
    expect(sellerConfirmResponse.body.data.sellerHandoffConfirmed).toBe(true)

    const buyerConfirmResponse = await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/confirm-received`)
      .set('Authorization', `Bearer ${buyer.token}`)

    expect(buyerConfirmResponse.status).toBe(200)
    expect(buyerConfirmResponse.body.data.status).toBe('completed')
    expect(buyerConfirmResponse.body.data.escrow.status).toBe('released')

    const sellerWallet = await request(app)
      .get('/api/wallet')
      .set('Authorization', `Bearer ${seller.token}`)

    expect(sellerWallet.status).toBe(200)
    expect(sellerWallet.body.data.balance).toBe(66)
  })

  test('concurrent buyer and seller handoff confirmations should release escrow', async () => {
    const seller = await registerUser('payflowSeller')
    const buyer = await registerUser('payflowBuyer')
    const product = await createProduct(seller.token, { price: 44 })

    await request(app)
      .post('/api/wallet/recharge')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ amount: 44 })

    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId: product.id })

    const orderId = orderResponse.body.data.id

    const payResponse = await request(app)
      .post(`/api/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${buyer.token}`)

    expect(payResponse.status).toBe(200)

    const [buyerConfirmResponse, sellerConfirmResponse] = await Promise.all([
      request(app)
        .post(`/api/orders/${orderId}/confirm-received`)
        .set('Authorization', `Bearer ${buyer.token}`),
      request(app)
        .post(`/api/orders/${orderId}/confirm-handoff`)
        .set('Authorization', `Bearer ${seller.token}`)
    ])

    expect([200, 400]).toContain(buyerConfirmResponse.status)
    expect([200, 400]).toContain(sellerConfirmResponse.status)

    const detailResponse = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${buyer.token}`)

    expect(detailResponse.status).toBe(200)
    expect(detailResponse.body.data.buyerHandoffConfirmed).toBe(true)
    expect(detailResponse.body.data.sellerHandoffConfirmed).toBe(true)
    expect(detailResponse.body.data.status).toBe('completed')
    expect(detailResponse.body.data.escrow.status).toBe('released')
  })

  test('paying without enough wallet balance should fail', async () => {
    const seller = await registerUser('insufficientSeller')
    const buyer = await registerUser('insufficientBuyer')
    const product = await createProduct(seller.token, { price: 50 })

    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId: product.id })

    expect(orderResponse.status).toBe(201)

    const payResponse = await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/pay`)
      .set('Authorization', `Bearer ${buyer.token}`)

    expect(payResponse.status).toBe(400)
    expect(payResponse.body.message).toBe('钱包余额不足，请先模拟充值')
  })

  test('duplicate pay after successful pay should return clean 400 without second charge', async () => {
    const seller = await registerUser('payflowSeller')
    const buyer = await registerUser('payflowBuyer')
    const product = await createProduct(seller.token, { price: 30 })

    await request(app)
      .post('/api/wallet/recharge')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ amount: 100 })

    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId: product.id })

    const orderId = orderResponse.body.data.id

    const firstPayResponse = await request(app)
      .post(`/api/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${buyer.token}`)

    expect(firstPayResponse.status).toBe(200)

    const secondPayResponse = await request(app)
      .post(`/api/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${buyer.token}`)

    expect(secondPayResponse.status).toBe(400)
    expect(secondPayResponse.body.message).toBe('订单状态不允许支付')

    const [escrows] = await pool.query(
      'SELECT COUNT(*) AS total FROM payment_escrows WHERE order_id = ?',
      [orderId]
    )
    const [payments] = await pool.query(
      "SELECT COUNT(*) AS total FROM wallet_transactions WHERE order_id = ? AND type = 'escrow_pay'",
      [orderId]
    )
    const walletResponse = await request(app)
      .get('/api/wallet')
      .set('Authorization', `Bearer ${buyer.token}`)

    expect(escrows[0].total).toBe(1)
    expect(payments[0].total).toBe(1)
    expect(walletResponse.body.data.balance).toBe(70)
  })

  test('dispute cannot be opened from pending payment order', async () => {
    const seller = await registerUser('disputeSeller')
    const buyer = await registerUser('disputeBuyer')
    const product = await createProduct(seller.token, { price: 25 })

    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId: product.id })

    const disputeResponse = await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/disputes`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ reason: '商品与描述不符' })

    expect(disputeResponse.status).toBe(400)
    expect(disputeResponse.body.message).toBe('订单状态不允许发起争议')
  })

  test('order detail should show active dispute and participant response', async () => {
    const seller = await registerUser('disputeSeller')
    const buyer = await registerUser('disputeBuyer')
    const product = await createProduct(seller.token, { price: 35 })

    await request(app)
      .post('/api/wallet/recharge')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ amount: 35 })

    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId: product.id })

    await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/pay`)
      .set('Authorization', `Bearer ${buyer.token}`)

    const disputeResponse = await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/disputes`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ reason: '商品与描述不符' })

    expect(disputeResponse.status).toBe(201)

    const buyerDetail = await request(app)
      .get(`/api/orders/${orderResponse.body.data.id}`)
      .set('Authorization', `Bearer ${buyer.token}`)

    expect(buyerDetail.status).toBe(200)
    expect(buyerDetail.body.data.status).toBe('disputed')
    expect(buyerDetail.body.data.escrow.status).toBe('disputed')
    expect(buyerDetail.body.data.disputes).toHaveLength(1)
    expect(buyerDetail.body.data.disputes[0].reason).toBe('商品与描述不符')

    const respondResponse = await request(app)
      .post(`/api/disputes/${disputeResponse.body.data.id}/respond`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ response: '卖家补充说明：可以退款或补发配件' })

    expect(respondResponse.status).toBe(200)
    expect(respondResponse.body.data.status).toBe('responded')

    const sellerDetail = await request(app)
      .get(`/api/orders/${orderResponse.body.data.id}`)
      .set('Authorization', `Bearer ${seller.token}`)

    expect(sellerDetail.status).toBe(200)
    expect(sellerDetail.body.data.disputes[0].response).toContain('卖家补充说明')
  })

  test('simulated dispute resolution endpoint should not exist', async () => {
    const seller = await registerUser('disputeSeller')
    const buyer = await registerUser('disputeBuyer')
    const product = await createProduct(seller.token, { price: 45 })

    await request(app)
      .post('/api/wallet/recharge')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ amount: 45 })

    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId: product.id })

    await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/pay`)
      .set('Authorization', `Bearer ${buyer.token}`)

    const disputeResponse = await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/disputes`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ reason: 'item failed after delivery' })

    const resolveResponse = await request(app)
      .post(`/api/disputes/${disputeResponse.body.data.id}/simulate-resolution`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ result: 'refund', resolutionNote: 'mock resolution should be unavailable' })

    expect(resolveResponse.status).toBe(404)
  })

  test('dispute refund should refund buyer and make product available', async () => {
    const seller = await registerUser('disputeSeller')
    const buyer = await registerUser('disputeBuyer')
    const admin = await registerAdmin('disputeAdmin')
    const product = await createProduct(seller.token, { price: 40 })

    await request(app)
      .post('/api/wallet/recharge')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ amount: 40 })

    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId: product.id })

    await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/pay`)
      .set('Authorization', `Bearer ${buyer.token}`)

    const disputeResponse = await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/disputes`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ reason: '商品与描述不符' })

    expect(disputeResponse.status).toBe(201)
    expect(disputeResponse.body.data.status).toBe('open')

    const participantResolveResponse = await request(app)
      .post(`/api/disputes/${disputeResponse.body.data.id}/resolve`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ result: 'refund', resolutionNote: '同意退款' })

    expect(participantResolveResponse.status).toBe(403)
    expect(participantResolveResponse.body.message).toBe('\u9700\u8981\u7ba1\u7406\u5458\u6743\u9650')

    const resolveResponse = await request(app)
      .post(`/api/disputes/${disputeResponse.body.data.id}/resolve`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ result: 'refund', resolutionNote: '同意退款' })

    expect(resolveResponse.status).toBe(200)
    expect(resolveResponse.body.data.status).toBe('resolved_refund')

    const respondAfterResolveResponse = await request(app)
      .post(`/api/disputes/${disputeResponse.body.data.id}/respond`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ response: '已经处理后不能再回应' })

    expect(respondAfterResolveResponse.status).toBe(400)
    expect(respondAfterResolveResponse.body.message).toBe('争议已处理')

    const repeatedResolveResponse = await request(app)
      .post(`/api/disputes/${disputeResponse.body.data.id}/resolve`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ result: 'refund', resolutionNote: '再次处理' })

    expect(repeatedResolveResponse.status).toBe(400)
    expect(repeatedResolveResponse.body.message).toBe('争议已处理')

    const orderDetail = await request(app)
      .get(`/api/orders/${orderResponse.body.data.id}`)
      .set('Authorization', `Bearer ${buyer.token}`)

    expect(orderDetail.body.data.status).toBe('refunded')

    const productDetail = await request(app)
      .get(`/api/products/${product.id}`)

    expect(productDetail.body.data.status).toBe('available')
  })

  test('admin dispute release should complete order and pay seller', async () => {
    const seller = await registerUser('disputeSeller')
    const buyer = await registerUser('disputeBuyer')
    const admin = await registerAdmin('disputeAdmin')
    const product = await createProduct(seller.token, { price: 55 })

    await request(app)
      .post('/api/wallet/recharge')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ amount: 55 })

    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId: product.id })

    await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/pay`)
      .set('Authorization', `Bearer ${buyer.token}`)

    const disputeResponse = await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/disputes`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ reason: 'buyer and seller disagree about inspection result' })

    const resolveResponse = await request(app)
      .post(`/api/disputes/${disputeResponse.body.data.id}/resolve`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ result: 'release', resolutionNote: 'release to seller' })

    expect(resolveResponse.status).toBe(200)
    expect(resolveResponse.body.data.status).toBe('resolved_release')

    const orderDetail = await request(app)
      .get(`/api/orders/${orderResponse.body.data.id}`)
      .set('Authorization', `Bearer ${seller.token}`)

    expect(orderDetail.body.data.status).toBe('completed')
    expect(orderDetail.body.data.escrow.status).toBe('released')

    const sellerWallet = await request(app)
      .get('/api/wallet')
      .set('Authorization', `Bearer ${seller.token}`)

    expect(sellerWallet.body.data.balance).toBe(55)
  })

  test('admin routes should check current database role', async () => {
    const admin = await registerAdmin('disputeAdmin')

    await pool.query('UPDATE users SET role = ? WHERE id = ?', ['user', admin.user.id])

    const response = await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${admin.token}`)

    expect(response.status).toBe(403)
    expect(response.body.message).toBe('\u9700\u8981\u7ba1\u7406\u5458\u6743\u9650')
  })

  test('ensureRuntimeSchema should not overwrite existing admin password', async () => {
    const [rows] = await pool.query(
      'SELECT password FROM users WHERE email = ?',
      ['admin@campustrade.com']
    )

    expect(rows).toHaveLength(1)

    const originalPassword = rows[0].password
    const customPassword = `custom-admin-password-${Date.now()}`

    try {
      await pool.query(
        'UPDATE users SET password = ? WHERE email = ?',
        [customPassword, 'admin@campustrade.com']
      )

      await ensureRuntimeSchema()

      const [updatedRows] = await pool.query(
        'SELECT password FROM users WHERE email = ?',
        ['admin@campustrade.com']
      )

      expect(updatedRows[0].password).toBe(customPassword)
    } finally {
      await pool.query(
        'UPDATE users SET password = ? WHERE email = ?',
        [originalPassword, 'admin@campustrade.com']
      )
    }
  })

  test('admin list endpoints should clamp page size', async () => {
    const admin = await registerAdmin('disputeAdmin')

    const productsResponse = await request(app)
      .get('/api/admin/products?page=0&pageSize=9999')
      .set('Authorization', `Bearer ${admin.token}`)

    expect(productsResponse.status).toBe(200)
    expect(productsResponse.body.data.page).toBe(1)
    expect(productsResponse.body.data.pageSize).toBe(100)

    const disputesResponse = await request(app)
      .get('/api/admin/disputes?page=0&pageSize=9999')
      .set('Authorization', `Bearer ${admin.token}`)

    expect(disputesResponse.status).toBe(200)
    expect(disputesResponse.body.data.page).toBe(1)
    expect(disputesResponse.body.data.pageSize).toBe(100)
  })

  test('admin product search should exclude removed products', async () => {
    const seller = await registerUser('disputeSeller')
    const admin = await registerAdmin('disputeAdmin')
    const visibleProduct = await createProduct(seller.token, {
      title: `Test API Admin Search Visible ${Date.now()}`,
      description: 'admin-search-target'
    })
    const removedProduct = await createProduct(seller.token, {
      title: `Test API Admin Search Removed ${Date.now()}`,
      description: 'admin-search-target'
    })

    const deleteResponse = await request(app)
      .delete(`/api/admin/products/${removedProduct.id}`)
      .set('Authorization', `Bearer ${admin.token}`)

    expect(deleteResponse.status).toBe(200)

    const response = await request(app)
      .get('/api/admin/products')
      .query({ status: 'all', search: 'admin-search-target', pageSize: 50 })
      .set('Authorization', `Bearer ${admin.token}`)

    expect(response.status).toBe(200)
    expect(response.body.data.products.some((item) => item.id === visibleProduct.id)).toBe(true)
    expect(response.body.data.products.some((item) => item.id === removedProduct.id)).toBe(false)
    expect(response.body.data.products.every((item) => item.status !== 'removed')).toBe(true)
  })

  test('admin dispute list should default to active and support resolved status filter', async () => {
    const seller = await registerUser('disputeSeller')
    const buyer = await registerUser('disputeBuyer')
    const admin = await registerAdmin('disputeAdmin')
    const product = await createProduct(seller.token, { price: 36 })

    await request(app)
      .post('/api/wallet/recharge')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ amount: 36 })

    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId: product.id })

    await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/pay`)
      .set('Authorization', `Bearer ${buyer.token}`)

    const disputeResponse = await request(app)
      .post(`/api/orders/${orderResponse.body.data.id}/disputes`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ reason: 'admin list filter coverage' })

    expect(disputeResponse.status).toBe(201)
    const disputeId = disputeResponse.body.data.id

    const activeResponse = await request(app)
      .get('/api/admin/disputes')
      .set('Authorization', `Bearer ${admin.token}`)

    expect(activeResponse.status).toBe(200)
    expect(activeResponse.body.data.disputes.some((item) => item.id === disputeId)).toBe(true)

    const resolveResponse = await request(app)
      .post(`/api/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ result: 'refund', resolutionNote: 'refund after admin review' })

    expect(resolveResponse.status).toBe(200)

    const defaultResponse = await request(app)
      .get('/api/admin/disputes')
      .set('Authorization', `Bearer ${admin.token}`)

    expect(defaultResponse.status).toBe(200)
    expect(defaultResponse.body.data.disputes.some((item) => item.id === disputeId)).toBe(false)

    const resolvedResponse = await request(app)
      .get('/api/admin/disputes')
      .query({ status: 'resolved_refund' })
      .set('Authorization', `Bearer ${admin.token}`)

    expect(resolvedResponse.status).toBe(200)
    expect(resolvedResponse.body.data.disputes.some((item) => item.id === disputeId)).toBe(true)
  })

  test('admin can remove a violating product', async () => {
    const seller = await registerUser('disputeSeller')
    const buyer = await registerUser('disputeBuyer')
    const admin = await registerAdmin('disputeAdmin')
    const product = await createProduct(seller.token, { title: 'Test API Violating Product' })

    const normalListResponse = await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${buyer.token}`)

    expect(normalListResponse.status).toBe(403)
    expect(normalListResponse.body.message).toBe('\u9700\u8981\u7ba1\u7406\u5458\u6743\u9650')

    const adminListResponse = await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${admin.token}`)

    expect(adminListResponse.status).toBe(200)
    expect(adminListResponse.body.data.products.some((item) => item.id === product.id)).toBe(true)

    const deleteResponse = await request(app)
      .delete(`/api/admin/products/${product.id}`)
      .set('Authorization', `Bearer ${admin.token}`)

    expect(deleteResponse.status).toBe(200)

    const productDetail = await request(app)
      .get(`/api/products/${product.id}`)

    expect(productDetail.status).toBe(404)
    expect(productDetail.body.code).toBe(404)
  })
})
