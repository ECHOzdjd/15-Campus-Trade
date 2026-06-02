const express = require('express')
const disputesController = require('../controllers/disputesController')
const authMiddleware = require('../middlewares/authMiddleware')
const adminMiddleware = require('../middlewares/adminMiddleware')

const router = express.Router()

router.post('/:id/respond', authMiddleware, disputesController.respond)
router.post('/:id/resolve', authMiddleware, adminMiddleware, disputesController.resolve)

module.exports = router
