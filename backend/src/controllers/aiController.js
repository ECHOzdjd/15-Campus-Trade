const aiService = require('../services/aiService')

function sendSuccess(res, data) {
  res.json({
    code: 200,
    message: 'success',
    data
  })
}

function productDraft(req, res, next) {
  try {
    sendSuccess(res, aiService.buildProductDraft(req.body))
  } catch (error) {
    next(error)
  }
}

function priceSuggestion(req, res, next) {
  try {
    sendSuccess(res, aiService.suggestPrice(req.body))
  } catch (error) {
    next(error)
  }
}

function riskCheck(req, res, next) {
  try {
    sendSuccess(res, aiService.riskCheck(req.body.content))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  productDraft,
  priceSuggestion,
  riskCheck
}
