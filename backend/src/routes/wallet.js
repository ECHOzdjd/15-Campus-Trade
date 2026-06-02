const express = require('express')
const walletController = require('../controllers/walletController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

router.get('/', authMiddleware, walletController.getWallet)
router.post('/recharge', authMiddleware, walletController.recharge)

module.exports = router
