const jwt = require('jsonwebtoken')
const authMiddleware = require('../../middlewares/authMiddleware')

// Mock jwt module
jest.mock('jsonwebtoken')

describe('authMiddleware', () => {
  let req, res, next

  beforeEach(() => {
    req = { headers: {} }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    next = jest.fn()
    jest.clearAllMocks()
  })

  // 测试1: 没有 Authorization 头
  test('should return 401 when no Authorization header', () => {
    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: '未登录，请先登录',
      data: null
    })
    expect(next).not.toHaveBeenCalled()
  })

  // 测试2: Authorization 头格式错误
  test('should return 401 when Authorization header is not Bearer token', () => {
    req.headers.authorization = 'Basic abc123'

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: '未登录，请先登录',
      data: null
    })
    expect(next).not.toHaveBeenCalled()
  })

  // 测试3: Token 无效
  test('should return 401 when token is invalid', () => {
    req.headers.authorization = 'Bearer invalid_token'
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token')
    })

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: 'Token 无效或已过期',
      data: null
    })
    expect(next).not.toHaveBeenCalled()
  })

  // 测试4: Token 有效，设置 req.user 并调用 next
  test('should set req.user and call next when token is valid', () => {
    const mockDecoded = { id: 1, email: 'test@example.com' }
    req.headers.authorization = 'Bearer valid_token'
    jwt.verify.mockReturnValue(mockDecoded)

    authMiddleware(req, res, next)

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', process.env.JWT_SECRET)
    expect(req.user).toEqual(mockDecoded)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})
