const request = require('supertest')
const app = require('../../app')
const packageJson = require('../../../package.json')

describe('monitoring endpoints and request logging', () => {
  let logSpy
  let errorSpy
  let originalLogLevel

  beforeEach(() => {
    originalLogLevel = process.env.LOG_LEVEL
    process.env.LOG_LEVEL = 'info'
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL
    } else {
      process.env.LOG_LEVEL = originalLogLevel
    }
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  test('GET /health returns structured service health data', async () => {
    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body.code).toBe(200)
    expect(response.body.message).toBe('OK')
    expect(response.body.data).toMatchObject({
      status: 'healthy',
      version: packageJson.version
    })
    expect(Date.parse(response.body.data.timestamp)).not.toBeNaN()
    expect(typeof response.body.data.uptimeSeconds).toBe('number')
  })

  test('GET /api/health keeps the same health response shape', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      status: 'healthy',
      version: packageJson.version
    })
    expect(Date.parse(response.body.data.timestamp)).not.toBeNaN()
  })

  test('GET /metrics reports request totals, response time, and error rate', async () => {
    const baselineResponse = await request(app).get('/metrics')
    const baseline = baselineResponse.body.data

    await request(app).get('/health')
    await request(app).get('/api/auth/me')

    const response = await request(app).get('/metrics')

    expect(response.status).toBe(200)
    expect(response.body.code).toBe(200)
    expect(response.body.data.totalRequests).toBeGreaterThanOrEqual(baseline.totalRequests + 2)
    expect(response.body.data.totalErrors).toBeGreaterThanOrEqual(baseline.totalErrors + 1)
    expect(response.body.data.errorRate).toBeGreaterThan(0)
    expect(response.body.data.averageResponseTimeMs).toBeGreaterThanOrEqual(0)
    expect(typeof response.body.data.activeRequests).toBe('number')
  })

  test('request middleware writes structured JSON logs', async () => {
    await request(app).get('/health')

    const requestLog = logSpy.mock.calls
      .map(([line]) => {
        try {
          return JSON.parse(line)
        } catch (_error) {
          return null
        }
      })
      .find((entry) => entry && entry.event === 'http_request')

    expect(requestLog).toMatchObject({
      level: 'info',
      event: 'http_request',
      method: 'GET',
      path: '/health',
      statusCode: 200
    })
    expect(typeof requestLog.requestId).toBe('string')
    expect(typeof requestLog.responseTimeMs).toBe('number')
    expect(Date.parse(requestLog.timestamp)).not.toBeNaN()
  })
})
