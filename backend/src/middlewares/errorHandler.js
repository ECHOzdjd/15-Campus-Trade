// 统一错误处理中间件
const logger = require('../utils/logger')

function errorHandler(err, req, res, _next) {
  const status = err.status || 500
  const code   = err.code   || status
  
  // 安全修复：在生产环境不暴露具体的数据库或系统错误信息
  let message = err.message || '服务器内部错误'
  
  // 只在开发环境暴露详细的错误信息
  if (process.env.NODE_ENV !== 'development') {
    // 生产环境：返回通用错误消息
    if (status === 500) {
      message = '服务器内部错误，请稍后重试'
    } else if (status === 400) {
      message = '请求参数有误'
    } else if (status === 401) {
      message = '未授权，请重新登录'
    } else if (status === 403) {
      message = '禁止访问'
    } else if (status === 404) {
      message = '请求的资源不存在'
    }
  }
  
  // 日志记录（用于审计）
  if (status >= 500) {
    logger.error('Request failed', {
      event: 'request_error',
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: status,
      error: {
        message: err.message,
        stack: err.stack
      }
    })
  }
  
  res.status(status).json({ code, message, data: null })
}

module.exports = errorHandler
