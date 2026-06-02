require('dotenv').config()
const express = require('express')
const cors = require('cors')
const packageJson = require('../package.json')

const authRoutes    = require('./routes/auth')
const productRoutes = require('./routes/products')
const orderRoutes   = require('./routes/orders')
const uploadRoutes  = require('./routes/upload')
const conversationRoutes = require('./routes/conversations')
const favoriteRoutes = require('./routes/favorites')
const walletRoutes = require('./routes/wallet')
const disputeRoutes = require('./routes/disputes')
const aiRoutes = require('./routes/ai')
const adminRoutes = require('./routes/admin')
const errorHandler  = require('./middlewares/errorHandler')
const requestLogger = require('./middlewares/requestLogger')
const ensureRuntimeSchema = require('./config/ensureSchema')
const { getMetricsSnapshot, metricsMiddleware } = require('./services/metrics')

const app = express()

// 基础中间件
app.use(cors())
app.use(metricsMiddleware)
app.use(requestLogger)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件（本地上传图片）
app.use('/uploads', express.static('uploads'))

// 路由注册
app.use('/api/auth',     authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders',   orderRoutes)
app.use('/api/upload',   uploadRoutes)
app.use('/api/conversations', conversationRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/disputes', disputeRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/admin', adminRoutes)

// 健康检查
const healthHandler = (req, res) => {
  res.json({
    code: 200,
    message: 'OK',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: packageJson.version,
      uptimeSeconds: Number(process.uptime().toFixed(2))
    }
  })
}

app.get('/health', healthHandler)
app.get('/api/health', healthHandler)

app.get('/metrics', (req, res) => {
  res.json({
    code: 200,
    message: 'OK',
    data: getMetricsSnapshot()
  })
})

// 统一错误处理
app.use(errorHandler)

const PORT = process.env.PORT || 3000

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function isRetryableDatabaseError(error) {
  return ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH']
    .includes(error.code)
}

async function ensureRuntimeSchemaWithRetry() {
  const maxAttempts = 30

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await ensureRuntimeSchema()
      return
    } catch (error) {
      if (attempt === maxAttempts || !isRetryableDatabaseError(error)) {
        throw error
      }

      console.warn(`Database is not ready yet (${attempt}/${maxAttempts}), retrying...`)
      await sleep(2000)
    }
  }
}

// 只有直接运行时才启动服务器（测试时不需要）
if (require.main === module) {
  ensureRuntimeSchemaWithRetry().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
      console.log('\n📝 初始测试用户:')
      console.log('  邮箱: user1@campustrade.com')
      console.log('  密码: Password123!')
      console.log('')
    })
  }).catch((error) => {
    console.error('Failed to prepare database schema:', error)
    process.exit(1)
  })
}

module.exports = app
