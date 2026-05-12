const pool = require('../config/db')
const orderModel = require('../models/orderModel')
const productModel = require('../models/productModel')

// 创建订单（使用事务）
async function create(req, res, next) {
  const connection = await pool.getConnection()

  try {
    const { productId } = req.body

    if (!productId) {
      return res.status(400).json({
        code: 400,
        message: '商品ID不能为空',
        data: null,
      })
    }

    // 开启事务
    await connection.beginTransaction()

    // 1. 检查商品是否可购买（使用 FOR UPDATE 锁定行）
    const product = await orderModel.checkProductAvailability(parseInt(productId), connection)

    if (!product) {
      await connection.rollback()
      return res.status(404).json({
        code: 404,
        message: '商品不存在',
        data: null,
      })
    }

    if (product.status !== 'available') {
      await connection.rollback()
      return res.status(400).json({
        code: 400,
        message: '商品已售出或已下架',
        data: null,
      })
    }

    // 不能购买自己的商品
    if (product.user_id === req.user.id) {
      await connection.rollback()
      return res.status(400).json({
        code: 400,
        message: '不能购买自己的商品',
        data: null,
      })
    }

    // 2. 创建订单
    const orderId = await orderModel.create({
      buyerId: req.user.id,
      sellerId: product.user_id,
      productId: parseInt(productId),
    }, connection)

    // 3. 更新商品状态为 sold
    await productModel.updateStatus(parseInt(productId), 'sold', connection)

    // 提交事务
    await connection.commit()

    // 获取订单详情
    const order = await orderModel.findById(orderId)

    res.status(201).json({
      code: 201,
      message: 'success',
      data: order,
    })
  } catch (error) {
    // 回滚事务
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

// 获取订单列表
async function getList(req, res, next) {
  try {
    const {
      page = 1,
      pageSize = 20,
      status = null,
      role = null
    } = req.query

    const filters = {
      userId: req.user.id,
      role: role || undefined,
      status: status || undefined,
      page: Math.max(1, parseInt(page)),
      pageSize: Math.max(1, Math.min(100, parseInt(pageSize))),
    }

    const { orders, total } = await orderModel.findAll(filters)

    res.json({
      code: 200,
      message: 'success',
      data: {
        orders,
        total,
        page: filters.page,
        pageSize: filters.pageSize,
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
    const order = await orderModel.findById(parseInt(id))

    if (!order) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在',
        data: null,
      })
    }

    // 权限检查：只有买家或卖家可以查看订单
    if (order.buyer.id !== req.user.id && order.seller.id !== req.user.id) {
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

    const order = await orderModel.findById(parseInt(id))
    if (!order) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在',
        data: null,
      })
    }

    // 权限检查：只有卖家可以确认订单
    if (order.seller.id !== req.user.id) {
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

    await orderModel.updateStatus(parseInt(id), 'confirmed')
    const updatedOrder = await orderModel.findById(parseInt(id))

    res.json({
      code: 200,
      message: 'success',
      data: updatedOrder,
    })
  } catch (error) {
    next(error)
  }
}

// 取消订单（使用事务恢复商品状态）
async function cancel(req, res, next) {
  const connection = await pool.getConnection()

  try {
    const { id } = req.params

    const order = await orderModel.findById(parseInt(id))
    if (!order) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在',
        data: null,
      })
    }

    // 权限检查：买家或卖家都可以取消
    if (order.buyer.id !== req.user.id && order.seller.id !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '无权限取消此订单',
        data: null,
      })
    }

    // 状态检查：只能取消 pending 状态的订单
    if (order.status !== 'pending') {
      return res.status(400).json({
        code: 400,
        message: '订单状态不允许取消',
        data: null,
      })
    }

    // 开启事务
    await connection.beginTransaction()

    // 1. 更新订单状态为 cancelled
    await orderModel.updateStatus(parseInt(id), 'cancelled', connection)

    // 2. 恢复商品状态为 available
    await productModel.updateStatus(order.product.id, 'available', connection)

    // 提交事务
    await connection.commit()

    const updatedOrder = await orderModel.findById(parseInt(id))

    res.json({
      code: 200,
      message: 'success',
      data: updatedOrder,
    })
  } catch (error) {
    // 回滚事务
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

module.exports = {
  create,
  getList,
  getDetail,
  confirm,
  cancel,
}
