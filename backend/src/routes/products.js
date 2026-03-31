const express = require('express')
const productsController = require('../controllers/productsController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

// 获取产品列表
router.get('/', productsController.getList)

// 获取我的产品列表（需要认证）
router.get('/my', authMiddleware, productsController.getMine)

// 获取产品详情
router.get('/:id', productsController.getDetail)

// 创建产品（需要认证）
router.post('/', authMiddleware, productsController.create)

// 更新产品（需要认证）
router.put('/:id', authMiddleware, productsController.update)

// 删除产品（需要认证）
router.delete('/:id', authMiddleware, productsController.remove)

module.exports = router

