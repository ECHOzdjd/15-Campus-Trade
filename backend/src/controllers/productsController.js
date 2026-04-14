const productModel = require('../models/productModel')

// 获取产品列表
async function getList(req, res, next) {
  try {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      category = null,
      minPrice = null,
      maxPrice = null,
      status = 'available',
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = req.query

    const filters = {
      search: search || undefined,
      category: category || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      status: status || 'available',
      sortBy: sortBy || 'created_at',
      sortOrder: sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
      page: Math.max(1, parseInt(page)),
      pageSize: Math.max(1, Math.min(100, parseInt(pageSize))),
    }

    const { products, total } = await productModel.findAll(filters)

    res.json({
      code: 200,
      message: 'success',
      data: {
        products,
        total,
        page: filters.page,
        pageSize: filters.pageSize,
      },
    })
  } catch (error) {
    next(error)
  }
}

// 获取产品详情
async function getDetail(req, res, next) {
  try {
    const { id } = req.params
    const product = await productModel.findById(parseInt(id))

    if (!product) {
      return res.status(404).json({
        code: 404,
        message: '产品不存在',
        data: null,
      })
    }

    res.json({
      code: 200,
      message: 'success',
      data: product,
    })
  } catch (error) {
    next(error)
  }
}

// 创建产品
async function create(req, res, next) {
  try {
    const { title, description, price, category, condition, images } = req.body

    // 参数验证
    if (!title || !price || !category || !condition) {
      return res.status(400).json({
        code: 400,
        message: '标题、价格、分类和成色不能为空',
        data: null,
      })
    }

    if (typeof title !== 'string' || title.length < 1 || title.length > 100) {
      return res.status(400).json({
        code: 400,
        message: '标题长度必须在 1-100 之间',
        data: null,
      })
    }

    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0.01) {
      return res.status(400).json({
        code: 400,
        message: '价格必须是正数',
        data: null,
      })
    }

    if (!['new', 'like_new', 'good', 'fair'].includes(condition)) {
      return res.status(400).json({
        code: 400,
        message: '成色无效',
        data: null,
      })
    }

    if (images && (!Array.isArray(images) || images.length > 5)) {
      return res.status(400).json({
        code: 400,
        message: '图片数量不能超过 5 张',
        data: null,
      })
    }

    const productId = await productModel.create({
      userId: req.user.id,
      title,
      description: description || '',
      price: priceNum,
      category,
      condition,
      images: images || [],
    })

    const product = await productModel.findById(productId)

    res.status(201).json({
      code: 201,
      message: 'success',
      data: product,
    })
  } catch (error) {
    next(error)
  }
}

// 更新产品
async function update(req, res, next) {
  try {
    const { id } = req.params
    const { title, description, price, category, condition, images, status } = req.body

    const product = await productModel.findById(parseInt(id))
    if (!product) {
      return res.status(404).json({
        code: 404,
        message: '产品不存在',
        data: null,
      })
    }

    // 权限检查：只有卖家可以修改自己的产品
    if (product.seller.id !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '无权限修改此产品',
        data: null,
      })
    }

    // 构建更新数据
    const updateData = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = parseFloat(price)
    if (category !== undefined) updateData.category = category
    if (condition !== undefined) updateData.condition = condition
    if (images !== undefined) updateData.images = images
    if (status !== undefined) updateData.status = status

    await productModel.update(parseInt(id), updateData)
    const updatedProduct = await productModel.findById(parseInt(id))

    res.json({
      code: 200,
      message: 'success',
      data: updatedProduct,
    })
  } catch (error) {
    next(error)
  }
}

// 删除产品
async function remove(req, res, next) {
  try {
    const { id } = req.params

    const product = await productModel.findById(parseInt(id))
    if (!product) {
      return res.status(404).json({
        code: 404,
        message: '产品不存在',
        data: null,
      })
    }

    // 权限检查：只有卖家可以删除自己的产品
    if (product.seller.id !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '无权限删除此产品',
        data: null,
      })
    }

    await productModel.delete(parseInt(id))

    res.json({
      code: 200,
      message: 'success',
      data: null,
    })
  } catch (error) {
    next(error)
  }
}

// 获取我的产品列表
async function getMine(req, res, next) {
  try {
    const products = await productModel.findByUserId(req.user.id)

    res.json({
      code: 200,
      message: 'success',
      data: {
        products,
        total: products.length,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getList,
  getDetail,
  create,
  update,
  remove,
  getMine,
}
