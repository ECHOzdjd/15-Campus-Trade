const errorHandler = require('../../middlewares/errorHandler')

describe('errorHandler logging', () => {
  let errorSpy
  let originalNodeEnv
  let originalLogLevel

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV
    originalLogLevel = process.env.LOG_LEVEL
    process.env.NODE_ENV = 'development'
    process.env.LOG_LEVEL = 'info'
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL
    } else {
      process.env.LOG_LEVEL = originalLogLevel
    }
    errorSpy.mockRestore()
  })

  test('logs server errors as structured JSON', () => {
    const error = new Error('database failed')
    const req = {
      method: 'GET',
      originalUrl: '/api/products'
    }
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    errorHandler(error, req, res, jest.fn())

    const logEntry = JSON.parse(errorSpy.mock.calls[0][0])
    expect(logEntry).toMatchObject({
      level: 'error',
      event: 'request_error',
      method: 'GET',
      path: '/api/products',
      statusCode: 500
    })
    expect(logEntry.error.message).toBe('database failed')
    expect(Date.parse(logEntry.timestamp)).not.toBeNaN()
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
