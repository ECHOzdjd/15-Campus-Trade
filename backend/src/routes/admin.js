const express = require('express')
const adminController = require('../controllers/adminController')
const authMiddleware = require('../middlewares/authMiddleware')
const adminMiddleware = require('../middlewares/adminMiddleware')

const router = express.Router()

router.use(authMiddleware, adminMiddleware)

router.get('/products', adminController.getProducts)
router.delete('/products/:id', adminController.removeProduct)
router.get('/disputes', adminController.getDisputes)

module.exports = router
