const express = require('express')
const aiController = require('../controllers/aiController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

router.post('/product-draft', authMiddleware, aiController.productDraft)
router.post('/price-suggestion', authMiddleware, aiController.priceSuggestion)
router.post('/risk-check', authMiddleware, aiController.riskCheck)

module.exports = router
