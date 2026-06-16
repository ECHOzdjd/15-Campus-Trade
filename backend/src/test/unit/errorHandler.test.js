jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}))

const logger = require('../../utils/logger')
const errorHandler = require('../../middlewares/errorHandler')

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  }
}

describe('errorHandler', () => {
  let originalNodeEnv

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV
    logger.error.mockClear()
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = originalNodeEnv
    }
  })

  test('keeps the original message in development and logs server errors', () => {
    const res = createResponse()
    const err = new Error('database failed')
    const req = { method: 'GET', originalUrl: '/api/products' }

    errorHandler(err, req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      code: 500,
      message: 'database failed',
      data: null
    })
    expect(logger.error).toHaveBeenCalledWith(
      'Request failed',
      expect.objectContaining({
        event: 'request_error',
        method: 'GET',
        path: '/api/products',
        statusCode: 500,
        error: expect.objectContaining({
          message: 'database failed'
        })
      })
    )
  })

  test.each([400, 401, 403, 404, 500])('maps production status %s to a safe response', (status) => {
    process.env.NODE_ENV = 'production'
    const res = createResponse()
    const err = new Error('raw database details')
    err.status = status

    errorHandler(err, { method: 'POST', originalUrl: '/api/test' }, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(status)
    expect(res.json).toHaveBeenCalledWith({
      code: status,
      message: expect.any(String),
      data: null
    })

    if (status >= 500) {
      expect(logger.error).toHaveBeenCalledTimes(1)
    } else {
      expect(logger.error).not.toHaveBeenCalled()
    }
  })
})
