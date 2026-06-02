const pool = require('../config/db')
const disputeModel = require('../models/disputeModel')
const orderModel = require('../models/orderModel')
const paymentModel = require('../models/paymentModel')

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
    product: { id: row.product_id },
    buyer: { id: row.buyer_id },
    seller: { id: row.seller_id }
  }
}

async function findOrderForUpdate(connection, orderId) {
  const [rows] = await connection.query(
    `SELECT id, buyer_id, seller_id, product_id, status
    FROM orders
    WHERE id = ?
    LIMIT 1
    FOR UPDATE`,
    [orderId]
  )

  return mapLockedOrder(rows[0])
}

async function respond(req, res, next) {
  try {
    const dispute = await disputeModel.findById(parseInt(req.params.id))
    const response = typeof req.body.response === 'string' ? req.body.response.trim() : ''

    if (!dispute) return errorResponse(res, 404, '争议不存在')

    if (!['open', 'responded'].includes(dispute.status)) {
      return errorResponse(res, 400, '争议已处理')
    }

    const order = await orderModel.findById(dispute.orderId)
    if (!order || !isParticipant(order, req.user.id)) {
      return errorResponse(res, 403, '无权回应此争议')
    }

    if (response.length < 5) return errorResponse(res, 400, '回应内容至少 5 个字')

    await disputeModel.respond(dispute.id, response)
    const updatedDispute = await disputeModel.findById(dispute.id)
    res.json({ code: 200, message: 'success', data: updatedDispute })
  } catch (error) {
    next(error)
  }
}

async function resolveDispute(req, res, next) {
  const connection = await pool.getConnection()
  let transactionStarted = false

  try {
    const { result } = req.body
    const resolutionNote = typeof req.body.resolutionNote === 'string'
      ? req.body.resolutionNote.trim()
      : null

    if (!['refund', 'release'].includes(result)) {
      return errorResponse(res, 400, '处理结果只能是 refund 或 release')
    }

    await connection.beginTransaction()
    transactionStarted = true
    const dispute = await disputeModel.findByIdForUpdate(parseInt(req.params.id), connection)

    if (!dispute) {
      await connection.rollback()
      return errorResponse(res, 404, '争议不存在')
    }

    if (dispute.status.startsWith('resolved_')) {
      await connection.rollback()
      return errorResponse(res, 400, '争议已处理')
    }

    const order = await findOrderForUpdate(connection, dispute.orderId)
    if (!order) {
      await connection.rollback()
      return errorResponse(res, 404, '订单不存在')
    }

    if (order.status !== 'disputed') {
      await connection.rollback()
      return errorResponse(res, 400, '订单状态不允许处理争议')
    }

    if (result === 'refund') {
      await paymentModel.refundEscrow(connection, order)
      await orderModel.updateStatus(order.id, 'refunded', connection)
      await connection.query(
        'UPDATE products SET status = ? WHERE id = ? AND status = ?',
        ['available', order.product.id, 'sold']
      )
      await disputeModel.resolve(dispute.id, 'resolved_refund', resolutionNote, connection)
    } else {
      await paymentModel.releaseEscrow(connection, order)
      await orderModel.updateStatus(order.id, 'completed', connection)
      await disputeModel.resolve(dispute.id, 'resolved_release', resolutionNote, connection)
    }
    await connection.commit()

    const updatedDispute = await disputeModel.findById(dispute.id)
    res.json({ code: 200, message: 'success', data: updatedDispute })
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback()
    }
    if (error.message === 'ESCROW_NOT_FOUND') {
      return errorResponse(res, 400, '订单没有可处理的托管资金')
    }
    next(error)
  } finally {
    connection.release()
  }
}

async function resolve(req, res, next) {
  return resolveDispute(req, res, next)
}

module.exports = {
  respond,
  resolve
}
