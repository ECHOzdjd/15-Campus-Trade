const disputeModel = require('../models/disputeModel')
const productModel = require('../models/productModel')

function parsePage(value) {
  const page = parseInt(value)
  return Number.isFinite(page) && page > 0 ? page : 1
}

function parsePageSize(value) {
  const pageSize = parseInt(value)
  return Number.isFinite(pageSize) && pageSize > 0 ? Math.min(100, pageSize) : 20
}

async function getProducts(req, res, next) {
  try {
    const page = parsePage(req.query.page)
    const pageSize = parsePageSize(req.query.pageSize)
    const status = req.query.status && req.query.status !== 'all' ? req.query.status : null
    const { products, total } = await productModel.findAll({
      page,
      pageSize,
      status,
      includeRemoved: false,
      search: req.query.search,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    })

    res.json({
      code: 200,
      message: 'success',
      data: { products, total, page, pageSize }
    })
  } catch (error) {
    next(error)
  }
}

async function removeProduct(req, res, next) {
  try {
    const productId = parseInt(req.params.id)
    const product = await productModel.findById(productId)

    if (!product) {
      return res.status(404).json({ code: 404, message: '\u5546\u54c1\u4e0d\u5b58\u5728', data: null })
    }

    await productModel.delete(productId)
    res.json({ code: 200, message: 'success', data: null })
  } catch (error) {
    next(error)
  }
}

async function getDisputes(req, res, next) {
  try {
    const page = parsePage(req.query.page)
    const pageSize = parsePageSize(req.query.pageSize)
    const status = req.query.status && req.query.status !== 'active' ? req.query.status : null
    const disputes = await disputeModel.findAll({ page, pageSize, status })

    res.json({
      code: 200,
      message: 'success',
      data: { disputes, page, pageSize }
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getProducts,
  removeProduct,
  getDisputes
}
