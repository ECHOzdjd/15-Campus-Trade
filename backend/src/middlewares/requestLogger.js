const { randomUUID } = require('crypto')
const logger = require('../utils/logger')

function requestLogger(req, res, next) {
  const started = process.hrtime.bigint()
  const requestId = req.headers['x-request-id'] || randomUUID()

  req.requestId = requestId
  res.setHeader('X-Request-Id', requestId)

  res.on('finish', () => {
    const responseTimeMs = Number(process.hrtime.bigint() - started) / 1000000

    logger.info('HTTP request completed', {
      event: 'http_request',
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      responseTimeMs: Number(responseTimeMs.toFixed(2))
    })
  })

  next()
}

module.exports = requestLogger
