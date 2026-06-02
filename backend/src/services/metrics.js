const startedAt = Date.now()

const metrics = {
  totalRequests: 0,
  totalErrors: 0,
  totalResponseTimeMs: 0,
  activeRequests: 0,
  lastRequestAt: null
}

function round(value) {
  return Number(value.toFixed(2))
}

function startRequestTimer() {
  const started = process.hrtime.bigint()
  let finished = false

  metrics.activeRequests += 1

  return (statusCode) => {
    if (finished) {
      return
    }

    finished = true
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1000000

    metrics.totalRequests += 1
    metrics.totalResponseTimeMs += elapsedMs
    metrics.activeRequests = Math.max(0, metrics.activeRequests - 1)
    metrics.lastRequestAt = new Date().toISOString()

    if (statusCode >= 400) {
      metrics.totalErrors += 1
    }
  }
}

function metricsMiddleware(req, res, next) {
  const complete = startRequestTimer()

  res.on('finish', () => {
    complete(res.statusCode)
  })
  res.on('close', () => {
    if (!res.writableEnded) {
      complete(res.statusCode || 499)
    }
  })

  next()
}

function getMetricsSnapshot() {
  const errorRate = metrics.totalRequests === 0
    ? 0
    : metrics.totalErrors / metrics.totalRequests
  const averageResponseTimeMs = metrics.totalRequests === 0
    ? 0
    : metrics.totalResponseTimeMs / metrics.totalRequests

  return {
    startedAt: new Date(startedAt).toISOString(),
    uptimeSeconds: round((Date.now() - startedAt) / 1000),
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    errorRate: Number(errorRate.toFixed(4)),
    averageResponseTimeMs: round(averageResponseTimeMs),
    activeRequests: metrics.activeRequests,
    lastRequestAt: metrics.lastRequestAt
  }
}

module.exports = {
  getMetricsSnapshot,
  metricsMiddleware
}
