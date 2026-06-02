const logger = require('../../utils/logger')

describe('structured logger', () => {
  let logSpy
  let errorSpy
  let originalLogLevel

  beforeEach(() => {
    originalLogLevel = process.env.LOG_LEVEL
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

  test('writes structured JSON logs with custom fields', () => {
    process.env.LOG_LEVEL = 'info'

    logger.info('Monitoring configured', { module: 'monitoring' })

    const entry = JSON.parse(logSpy.mock.calls[0][0])
    expect(entry).toMatchObject({
      level: 'info',
      service: 'campus-trade-backend',
      message: 'Monitoring configured',
      module: 'monitoring'
    })
    expect(Date.parse(entry.timestamp)).not.toBeNaN()
  })

  test('suppresses logs below the configured level', () => {
    process.env.LOG_LEVEL = 'error'

    logger.info('ignored')
    logger.error('kept')

    expect(logSpy).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(JSON.parse(errorSpy.mock.calls[0][0]).level).toBe('error')
  })
})
