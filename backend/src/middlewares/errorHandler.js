// 统一错误处理中间件
function errorHandler(err, req, res, _next) {
  const status = err.status || 500
  const code   = err.code   || status
  const message = err.message || '服务器内部错误'
  res.status(status).json({ code, message, data: null })
}

module.exports = errorHandler
