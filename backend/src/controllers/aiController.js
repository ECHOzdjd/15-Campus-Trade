const aiService = require('../services/aiService')

function sendSuccess(res, data) {
  res.json({
    code: 200,
    message: 'success',
    data
  })
}

async function productDraft(req, res, next) {
  try {
    sendSuccess(res, await aiService.buildProductDraft(req.body))
  } catch (error) {
    next(error)
  }
}

async function priceSuggestion(req, res, next) {
  try {
    sendSuccess(res, await aiService.suggestPrice(req.body))
  } catch (error) {
    next(error)
  }
}

async function riskCheck(req, res, next) {
  try {
    sendSuccess(res, await aiService.riskCheck(req.body.content))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  productDraft,
  priceSuggestion,
  riskCheck
}
