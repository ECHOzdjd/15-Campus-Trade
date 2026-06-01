const favoriteModel = require('../models/favoriteModel')
const productModel = require('../models/productModel')

async function getList(req, res, next) {
  try {
    const products = await favoriteModel.findByUser(req.user.id)
    res.json({
      code: 200,
      message: 'success',
      data: {
        products,
        total: products.length
      }
    })
  } catch (error) {
    next(error)
  }
}

async function check(req, res, next) {
  try {
    const productId = parseInt(req.params.productId)
    const favorited = await favoriteModel.isFavorited(req.user.id, productId)
    res.json({ code: 200, message: 'success', data: { favorited } })
  } catch (error) {
    next(error)
  }
}

async function add(req, res, next) {
  try {
    const productId = parseInt(req.params.productId)
    const product = await productModel.findById(productId)
    if (!product) {
      return res.status(404).json({ code: 404, message: '商品不存在', data: null })
    }

    await favoriteModel.add(req.user.id, productId)
    res.status(201).json({ code: 201, message: 'success', data: { favorited: true } })
  } catch (error) {
    next(error)
  }
}

async function remove(req, res, next) {
  try {
    const productId = parseInt(req.params.productId)
    await favoriteModel.remove(req.user.id, productId)
    res.json({ code: 200, message: 'success', data: { favorited: false } })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getList,
  check,
  add,
  remove
}
