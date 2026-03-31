// 模拟数据库 - 实际项目应使用真实数据库
const orders = []
let nextOrderId = 1
let nextOrderNumber = 20260330001

// 创建订单
async function create(req, res, next) {
  try {
    const { productId, shippingAddress } = req.body

    if (!productId || !shippingAddress) {
      return res.status(400).json({
        code: 400,
        message: '参数缺失',
        data: null,
      })
    }

    if (typeof shippingAddress !== 'string' || shippingAddress.length < 1 || shippingAddress.length > 200) {
      return res.status(400).json({
        code: 400,
        message: '配送地址长度必须在 1-200 之间',
        data: null,
      })
    }

    // 在实际项目中应从数据库查询产品
    // 这里只是模拟
    const products = require('./productsController')
    // 为了简化，我们直接创建订单而不检查产品是否存在

    const order = {
      id: nextOrderId++,
      orderNumber: 'ORD' + (nextOrderNumber++),
      productId: parseInt(productId),
      product: {
        id: productId,
        title: '产品' + productId,
        price: 999.99,
        images: []
      },
      buyerId: req.user.id,
      sellerId: 2, // 假设卖家 ID 为 2
      seller: {
        id: 2,
        username: '用户2',
        avatar: null
      },
      price: 999.99,
      status: 'pending',
      shippingAddress,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    orders.push(order)

    res.status(201).json({
      code: 201,
      message: 'success',
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

// 获取订单列表
async function getList(req, res, next) {
  try {
    const {
      page = 1,
      pageSize = 10,
      status = null,
      role = 'all'
    } = req.query

    let filtered = [...orders]

    // 根据角色筛选
    if (role === 'buyer') {
      filtered = filtered.filter(o => o.buyerId === req.user.id)
    } else if (role === 'seller') {
      filtered = filtered.filter(o => o.sellerId === req.user.id)
    } else {
      // all
      filtered = filtered.filter(o => o.buyerId === req.user.id || o.sellerId === req.user.id)
    }

    // 状态筛选
    if (status) {
      filtered = filtered.filter(o => o.status === status)
    }

    // 分页
    const pageNum = Math.max(1, parseInt(page))
    const pageSizeNum = Math.max(1, parseInt(pageSize))
    const start = (pageNum - 1) * pageSizeNum
    const items = filtered.slice(start, start + pageSizeNum)

    res.json({
      code: 200,
      message: 'success',
      data: {
        total: filtered.length,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(filtered.length / pageSizeNum),
        items,
      },
    })
  } catch (error) {
    next(error)
  }
}

// 获取订单详情
async function getDetail(req, res, next) {
  try {
    const { id } = req.params
    const order = orders.find(o => o.id === parseInt(id))

    if (!order) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在',
        data: null,
      })
    }

    // 权限检查：只有买家或卖家可以查看订单
    if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '无权限查看此订单',
        data: null,
      })
    }

    res.json({
      code: 200,
      message: 'success',
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

// 确认订单（卖家发货）
async function confirm(req, res, next) {
  try {
    const { id } = req.params
    const { trackingNumber } = req.body

    const order = orders.find(o => o.id === parseInt(id))
    if (!order) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在',
        data: null,
      })
    }

    // 权限检查：只有卖家可以确认订单
    if (order.sellerId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '无权限确认此订单',
        data: null,
      })
    }

    // 状态检查
    if (order.status !== 'pending') {
      return res.status(400).json({
        code: 400,
        message: '订单状态不允许确认',
        data: null,
      })
    }

    order.status = 'shipped'
    if (trackingNumber) {
      order.trackingNumber = trackingNumber
    }
    order.updatedAt = new Date()

    res.json({
      code: 200,
      message: 'success',
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

// 取消订单
async function cancel(req, res, next) {
  try {
    const { id } = req.params
    const { reason } = req.body

    const order = orders.find(o => o.id === parseInt(id))
    if (!order) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在',
        data: null,
      })
    }

    // 权限检查：买家或卖家都可以取消，但有条件
    if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '无权限取消此订单',
        data: null,
      })
    }

    // 状态检查：不能取消已完成的订单
    if (order.status === 'completed' || order.status === 'cancelled') {
      return res.status(400).json({
        code: 400,
        message: '订单不能取消',
        data: null,
      })
    }

    order.status = 'cancelled'
    if (reason) {
      order.cancelReason = reason
    }
    order.updatedAt = new Date()

    res.json({
      code: 200,
      message: 'success',
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  create,
  getList,
  getDetail,
  confirm,
  cancel,
}
