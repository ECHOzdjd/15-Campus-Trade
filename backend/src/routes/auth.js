const express = require('express')
const authController = require('../controllers/authController')
const authMiddleware = require('../middlewares/authMiddleware')
const loginLimitMiddleware = require('../middlewares/loginLimitMiddleware')

const router = express.Router()

// 注册
router.post('/register', authController.register)

// 登录（应用登录限频中间件防止暴力破解）
router.post('/login', loginLimitMiddleware, authController.login)

// 获取当前用户信息（需要认证）
router.get('/me', authMiddleware, authController.getMe)

// 修改密码（需要认证）
router.put('/password', authMiddleware, authController.updatePassword)

module.exports = router


