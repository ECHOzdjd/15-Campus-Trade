const express = require('express')
const conversationsController = require('../controllers/conversationsController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

router.post('/', authMiddleware, conversationsController.create)
router.get('/', authMiddleware, conversationsController.getList)
router.get('/:id/stream', conversationsController.streamAuth, conversationsController.stream)
router.get('/:id', authMiddleware, conversationsController.getDetail)
router.post('/:id/messages', authMiddleware, conversationsController.sendMessage)
router.put('/:id/read', authMiddleware, conversationsController.markRead)

module.exports = router
