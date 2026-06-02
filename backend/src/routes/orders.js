const express = require('express')
const ordersController = require('../controllers/ordersController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

// 创建订单（需要认证）
router.post('/', authMiddleware, ordersController.create)

// 获取订单列表（需要认证）
router.get('/', authMiddleware, ordersController.getList)

// 获取订单详情（需要认证）
router.get('/:id', authMiddleware, ordersController.getDetail)

router.post('/:id/pay', authMiddleware, ordersController.pay)

router.post('/:id/confirm-received', authMiddleware, ordersController.confirmReceived)

router.post('/:id/confirm-handoff', authMiddleware, ordersController.confirmHandoff)

router.post('/:id/request-release', authMiddleware, ordersController.createDispute)

router.post('/:id/disputes', authMiddleware, ordersController.createDispute)

// 确认订单（需要认证）
router.put('/:id/confirm', authMiddleware, ordersController.confirm)

// 取消订单（需要认证）
router.put('/:id/cancel', authMiddleware, ordersController.cancel)

module.exports = router

