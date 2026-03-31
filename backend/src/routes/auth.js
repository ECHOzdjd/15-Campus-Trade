const express = require('express')
const authController = require('../controllers/authController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

// 注册
router.post('/register', authController.register)

// 登录
router.post('/login', authController.login)

// 获取当前用户信息（需要认证）
router.get('/me', authMiddleware, authController.getMe)

// 修改密码（需要认证）
router.put('/password', authMiddleware, authController.updatePassword)

module.exports = router

