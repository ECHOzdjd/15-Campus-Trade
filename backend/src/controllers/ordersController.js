const pool = require('../config/db')
const conversationEvents = require('../services/conversationEvents')
const conversationModel = require('../models/conversationModel')
const disputeModel = require('../models/disputeModel')
const orderModel = require('../models/orderModel')
const paymentModel = require('../models/paymentModel')
const productModel = require('../models/productModel')
const { expirePendingPaymentOrders } = require('../services/orderExpiryService')

function errorResponse(res, status, message) {
  return res.status(status).json({ code: status, message, data: null })
}

function isParticipant(order, userId) {
  return order.buyer.id === userId || order.seller.id === userId
}

function mapLockedOrder(row) {
  if (!row) return null

  return {
    id: row.id,
    status: row.status,
    buyerHandoffConfirmed: Boolean(row.buyer_handoff_confirmed),
    sellerHandoffConfirmed: Boolean(row.seller_handoff_confirmed),
    product: {
      id: row.product_id,
      price: parseFloat(row.product_price)
    },
    buyer: { id: row.buyer_id },
    seller: { id: row.seller_id }
  }
}

async function findOrderForUpdate(connection, orderId) {
  const [rows] = await connection.query(
    `SELECT
      o.id, o.buyer_id, o.seller_id, o.product_id, o.status,
      o.buyer_handoff_confirmed, o.seller_handoff_confirmed,
      p.price AS product_price
    FROM orders o
    LEFT JOIN products p ON p.id = o.product_id
    WHERE o.id = ?
    LIMIT 1
    FOR UPDATE`,
    [orderId]
  )

  return mapLockedOrder(rows[0])
}

async function addOrderSystemMessage(orderId, content) {
  try {
    const conversationId = await conversationModel.findConversationIdByOrderId(orderId)
    if (!conversationId) return

    const messageId = await conversationModel.createMessage({
      conversationId,
      senderId: null,
      type: 'system',
      content
    })
    const message = await conversationModel.findMessageById(messageId)
    conversationEvents.notifyClients(conversationId, message)
  } catch (error) {
    console.warn(`Failed to add order system message for order ${orderId}: ${error.message}`)
  }
}

async function create(req, res, next) {
  const connection = await pool.getConnection()
  let orderId = null

  try {
    const productId = parseInt(req.body.productId)

    if (!productId) {
      return errorResponse(res, 400, '商品ID不能为空')
    }

    await connection.beginTransaction()
    const product = await orderModel.checkProductAvailability(productId, connection)

    if (!product) {
      await connection.rollback()
      return errorResponse(res, 404, '商品不存在')
    }

    if (product.status !== 'available') {
      await connection.rollback()
      return errorResponse(res, 400, '商品已售出或已下架')
    }

    if (product.user_id === req.user.id) {
      await connection.rollback()
      return errorResponse(res, 400, '不能购买自己的商品')
    }

    orderId = await orderModel.create({
      buyerId: req.user.id,
      sellerId: product.user_id,
      productId
    }, connection)

    await productModel.updateStatus(productId, 'sold', connection)
    await conversationModel.findOrCreate({
      buyerId: req.user.id,
      sellerId: product.user_id,
      productId
    }, connection)
    await connection.commit()

    await addOrderSystemMessage(orderId, '买家已下单，请在 30 分钟内支付到平台托管。')
    const order = await orderModel.findById(orderId)
    res.status(201).json({ code: 201, message: 'success', data: order })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

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
      pageSize: Math.max(1, Math.min(100, parseInt(pageSize)))
    }

    const { orders, total } = await orderModel.findAll(filters)

    res.json({
      code: 200,
      message: 'success',
      data: {
        orders,
        total,
        page: filters.page,
        pageSize: filters.pageSize
      }
    })
  } catch (error) {
    next(error)
  }
}

async function getDetail(req, res, next) {
  try {
    const order = await orderModel.findById(parseInt(req.params.id))

    if (!order) {
      return errorResponse(res, 404, '订单不存在')
    }

    if (!isParticipant(order, req.user.id)) {
      return errorResponse(res, 403, '无权限查看此订单')
    }

    const disputes = await disputeModel.findByOrderId(order.id)
    res.json({ code: 200, message: 'success', data: { ...order, disputes } })
  } catch (error) {
    next(error)
  }
}

async function pay(req, res, next) {
  await expirePendingPaymentOrders()
  const connection = await pool.getConnection()
  const orderId = parseInt(req.params.id)

  try {
    await connection.beginTransaction()
    const order = await findOrderForUpdate(connection, orderId)

    if (!order) {
      await connection.rollback()
      return errorResponse(res, 404, '订单不存在')
    }

    if (order.buyer.id !== req.user.id) {
      await connection.rollback()
      return errorResponse(res, 403, '无权支付此订单')
    }

    if (order.status !== 'pending_payment') {
      await connection.rollback()
      return errorResponse(res, 400, '订单状态不允许支付')
    }

    try {
      await paymentModel.payToEscrow(connection, order)
    } catch (error) {
      if (error.message === 'INSUFFICIENT_BALANCE') {
        await connection.rollback()
        return errorResponse(res, 400, '钱包余额不足，请先模拟充值')
      }
      throw error
    }

    await orderModel.updateStatus(orderId, 'paid_escrow', connection)
    await connection.commit()

    await addOrderSystemMessage(orderId, '买家已付款到平台托管，双方可以约定校园面交。')
    const updatedOrder = await orderModel.findById(orderId)
    res.json({ code: 200, message: 'success', data: updatedOrder })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function confirmHandoffForRole(req, res, next, role) {
  const connection = await pool.getConnection()
  const orderId = parseInt(req.params.id)
  let systemMessage = null

  try {
    await connection.beginTransaction()
    const order = await findOrderForUpdate(connection, orderId)

    if (!order) {
      await connection.rollback()
      return errorResponse(res, 404, '订单不存在')
    }

    if (role === 'buyer' && order.buyer.id !== req.user.id) {
      await connection.rollback()
      return errorResponse(res, 403, '无权确认此订单')
    }

    if (role === 'seller' && order.seller.id !== req.user.id) {
      await connection.rollback()
      return errorResponse(res, 403, '无权确认此订单')
    }

    if (!['paid_escrow', 'meeting_confirmed'].includes(order.status)) {
      await connection.rollback()
      return errorResponse(res, 400, '订单状态不允许确认')
    }

    if (role === 'buyer') {
      await orderModel.markBuyerHandoffConfirmed(orderId, connection)
    } else {
      await orderModel.markSellerHandoffConfirmed(orderId, connection)
    }

    const buyerConfirmed = role === 'buyer' || order.buyerHandoffConfirmed
    const sellerConfirmed = role === 'seller' || order.sellerHandoffConfirmed

    if (buyerConfirmed && sellerConfirmed) {
      await paymentModel.releaseEscrow(connection, {
        ...order,
        buyerHandoffConfirmed: buyerConfirmed,
        sellerHandoffConfirmed: sellerConfirmed
      })
      await orderModel.updateStatus(orderId, 'completed', connection)
      systemMessage = '双方已确认面交，平台托管金额已放款给卖家。'
    } else {
      await orderModel.updateStatus(orderId, 'meeting_confirmed', connection)
      systemMessage = role === 'buyer'
        ? '买家已确认收到商品，等待卖家确认面交。'
        : '卖家已确认完成面交，等待买家确认收货。'
    }

    await connection.commit()
    await addOrderSystemMessage(orderId, systemMessage)
    const updatedOrder = await orderModel.findById(orderId)
    res.json({ code: 200, message: 'success', data: updatedOrder })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function confirmReceived(req, res, next) {
  return confirmHandoffForRole(req, res, next, 'buyer')
}

async function confirmHandoff(req, res, next) {
  return confirmHandoffForRole(req, res, next, 'seller')
}

async function confirm(req, res, next) {
  return confirmHandoff(req, res, next)
}

async function cancel(req, res, next) {
  const connection = await pool.getConnection()
  const orderId = parseInt(req.params.id)

  try {
    await connection.beginTransaction()
    const order = await findOrderForUpdate(connection, orderId)

    if (!order) {
      await connection.rollback()
      return errorResponse(res, 404, '订单不存在')
    }

    if (!isParticipant(order, req.user.id)) {
      await connection.rollback()
      return errorResponse(res, 403, '无权取消此订单')
    }

    if (order.status !== 'pending_payment') {
      await connection.rollback()
      return errorResponse(res, 400, '订单状态不允许取消')
    }

    await orderModel.updateStatus(orderId, 'cancelled', connection)
    await connection.query(
      'UPDATE products SET status = ? WHERE id = ? AND status = ?',
      ['available', order.product.id, 'sold']
    )
    await connection.commit()

    const updatedOrder = await orderModel.findById(orderId)
    res.json({ code: 200, message: 'success', data: updatedOrder })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

async function createDispute(req, res, next) {
  const connection = await pool.getConnection()
  const orderId = parseInt(req.params.id)
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : ''

  try {
    if (reason.length < 5) return errorResponse(res, 400, '争议原因至少 5 个字')

    await connection.beginTransaction()
    const order = await findOrderForUpdate(connection, orderId)

    if (!order) {
      await connection.rollback()
      return errorResponse(res, 404, '订单不存在')
    }

    if (!isParticipant(order, req.user.id)) {
      await connection.rollback()
      return errorResponse(res, 403, '无权发起此争议')
    }

    if (!['paid_escrow', 'meeting_confirmed'].includes(order.status)) {
      await connection.rollback()
      return errorResponse(res, 400, '订单状态不允许发起争议')
    }

    const [activeDisputes] = await connection.query(
      "SELECT id FROM disputes WHERE order_id = ? AND status IN ('open', 'responded') LIMIT 1 FOR UPDATE",
      [orderId]
    )
    if (activeDisputes.length > 0) {
      await connection.rollback()
      return errorResponse(res, 400, '订单已有进行中的争议')
    }

    const [escrowUpdate] = await connection.query(
      "UPDATE payment_escrows SET status = 'disputed' WHERE order_id = ? AND status = 'held'",
      [orderId]
    )
    if (escrowUpdate.affectedRows === 0) {
      await connection.rollback()
      return errorResponse(res, 400, '订单没有可处理的托管资金')
    }

    const disputeId = await disputeModel.create({ orderId, openedBy: req.user.id, reason }, connection)
    await orderModel.updateStatus(orderId, 'disputed', connection)
    await connection.commit()

    await addOrderSystemMessage(orderId, '交易已进入争议处理，托管金额暂不放款。')
    const dispute = await disputeModel.findById(disputeId)
    res.status(201).json({ code: 201, message: 'success', data: dispute })
  } catch (error) {
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
  pay,
  confirmReceived,
  confirmHandoff,
  cancel,
  createDispute
}
