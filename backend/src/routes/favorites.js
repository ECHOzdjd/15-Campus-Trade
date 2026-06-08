const express = require('express')
const favoritesController = require('../controllers/favoritesController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

router.get('/', authMiddleware, favoritesController.getList)
router.get('/:productId', authMiddleware, favoritesController.check)
router.post('/:productId', authMiddleware, favoritesController.add)
router.delete('/:productId', authMiddleware, favoritesController.remove)

module.exports = router
