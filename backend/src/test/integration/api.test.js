const request = require('supertest')
const app = require('../../app')
const pool = require('../../config/db')

// 清理测试数据
afterAll(async () => {
  // 清理测试创建的用户和商品
  await pool.query('DELETE FROM products WHERE title LIKE \'Test%API%\'')
  await pool.query('DELETE FROM users WHERE email LIKE \'test%api%\'')
  await pool.end()
})

describe('API Integration Tests', () => {
  let testToken
  let testUserId
  let testProductId

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
  })

  // 测试8: 获取用户信息 - 无 Token
  test('GET /api/auth/me - should fail without token', async () => {
    const response = await request(app)
      .get('/api/auth/me')

    expect(response.status).toBe(401)
    expect(response.body.code).toBe(401)
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
})
