require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const authRoutes    = require('./routes/auth')
const productRoutes = require('./routes/products')
const orderRoutes   = require('./routes/orders')
const uploadRoutes  = require('./routes/upload')
const errorHandler  = require('./middlewares/errorHandler')

const app = express()

// 基础中间件
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件（本地上传图片）
app.use('/uploads', express.static('uploads'))

// 路由注册
app.use('/api/auth',     authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders',   orderRoutes)
app.use('/api/upload',   uploadRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: 'OK' })
})

// 统一错误处理
app.use(errorHandler)

const PORT = process.env.PORT || 3000

// 只有直接运行时才启动服务器（测试时不需要）
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    console.log('\n📝 初始测试用户:')
    console.log('  邮箱: user1@campustrade.com')
    console.log('  密码: Password123!')
    console.log('')
  })
}

module.exports = app
