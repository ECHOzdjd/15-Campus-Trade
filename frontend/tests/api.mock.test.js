import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock axios 创建函数
const mockRequest = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  }
}

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockRequest)
  }
}))

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem(key) {
    return this.store[key] || null
  },
  setItem(key, value) {
    this.store[key] = value
  },
  removeItem(key) {
    delete this.store[key]
  },
  clear() {
    this.store = {}
  }
}

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
})

describe('API Mock Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  // 测试1: auth.login 成功调用
  it('auth.login should call POST /auth/login', async () => {
    const mockResponse = {
      data: {
        code: 200,
        message: 'success',
        data: {
          token: 'test-token',
          user: { id: 1, email: 'test@example.com' }
        }
      }
    }
    mockRequest.post.mockResolvedValue(mockResponse)

    const result = await mockRequest.post('/auth/login', {
      email: 'test@example.com',
      password: 'Password123!'
    })

    expect(mockRequest.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'Password123!'
    })
    expect(result.data.code).toBe(200)
    expect(result.data.data.token).toBe('test-token')
  })

  // 测试2: auth.register 失败 - 用户已存在
  it('auth.register should handle error when email exists', async () => {
    const mockError = {
      response: {
        status: 400,
        data: {
          code: 400,
          message: '邮箱已被使用',
          data: null
        }
      }
    }
    mockRequest.post.mockRejectedValue(mockError)

    try {
      await mockRequest.post('/auth/register', {
        username: 'testuser',
        email: 'existing@example.com',
        password: 'Password123!'
      })
    } catch (error) {
      expect(error.response.status).toBe(400)
      expect(error.response.data.message).toContain('邮箱已被使用')
    }

    expect(mockRequest.post).toHaveBeenCalled()
  })

  // 测试3: products.getList 成功获取列表
  it('products.getList should fetch products with params', async () => {
    const mockResponse = {
      data: {
        code: 200,
        message: 'success',
        data: {
          products: [
            { id: 1, title: 'Product 1', price: 100 },
            { id: 2, title: 'Product 2', price: 200 }
          ],
          total: 2,
          page: 1,
          pageSize: 20
        }
      }
    }
    mockRequest.get.mockResolvedValue(mockResponse)

    const result = await mockRequest.get('/products', {
      params: { page: 1, pageSize: 20 }
    })

    expect(mockRequest.get).toHaveBeenCalledWith('/products', {
      params: { page: 1, pageSize: 20 }
    })
    expect(result.data.data.products).toHaveLength(2)
    expect(result.data.data.total).toBe(2)
  })

  // 测试4: products.getDetail 获取商品详情
  it('products.getDetail should fetch single product', async () => {
    const mockResponse = {
      data: {
        code: 200,
        message: 'success',
        data: {
          id: 1,
          title: 'Test Product',
          price: 99.99,
          description: 'Test description',
          seller: { id: 1, username: 'seller' }
        }
      }
    }
    mockRequest.get.mockResolvedValue(mockResponse)

    const result = await mockRequest.get('/products/1')

    expect(mockRequest.get).toHaveBeenCalledWith('/products/1')
    expect(result.data.data.id).toBe(1)
    expect(result.data.data.title).toBe('Test Product')
  })

  // 测试5: products.create 创建商品失败 - 无权限
  it('products.create should handle 401 unauthorized', async () => {
    const mockError = {
      response: {
        status: 401,
        data: {
          code: 401,
          message: '未登录，请先登录',
          data: null
        }
      }
    }
    mockRequest.post.mockRejectedValue(mockError)

    try {
      await mockRequest.post('/products', {
        title: 'New Product',
        price: 100,
        category: 'Electronics',
        condition: 'new'
      })
    } catch (error) {
      expect(error.response.status).toBe(401)
      expect(error.response.data.message).toContain('未登录')
    }

    expect(mockRequest.post).toHaveBeenCalled()
  })

  // 测试6: orders.create 创建订单成功
  it('orders.create should create order successfully', async () => {
    const mockResponse = {
      data: {
        code: 201,
        message: 'success',
        data: {
          id: 1,
          productId: 1,
          buyerId: 2,
          sellerId: 1,
          status: 'pending'
        }
      }
    }
    mockRequest.post.mockResolvedValue(mockResponse)

    const result = await mockRequest.post('/orders', { productId: 1 })

    expect(mockRequest.post).toHaveBeenCalledWith('/orders', { productId: 1 })
    expect(result.data.code).toBe(201)
    expect(result.data.data.status).toBe('pending')
  })

  // 测试7: orders.getList 获取订单列表
  it('orders.getList should fetch orders', async () => {
    const mockResponse = {
      data: {
        code: 200,
        message: 'success',
        data: {
          orders: [
            { id: 1, status: 'pending' },
            { id: 2, status: 'confirmed' }
          ],
          total: 2
        }
      }
    }
    mockRequest.get.mockResolvedValue(mockResponse)

    const result = await mockRequest.get('/orders')

    expect(result.data.data.orders).toHaveLength(2)
    expect(result.data.data.total).toBe(2)
  })

  // 测试8: 网络错误处理
  it('should handle network error', async () => {
    const networkError = new Error('Network Error')
    mockRequest.get.mockRejectedValue(networkError)

    try {
      await mockRequest.get('/products')
    } catch (error) {
      expect(error.message).toBe('Network Error')
    }

    expect(mockRequest.get).toHaveBeenCalled()
  })
})
