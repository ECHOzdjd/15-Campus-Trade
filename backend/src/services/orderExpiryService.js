const pool = require('../config/db')
const orderModel = require('../models/orderModel')

async function expireWithConnection(connection) {
  const orders = await orderModel.findExpiredPendingPayments(connection)

  for (const order of orders) {
    await orderModel.updateStatus(order.id, 'cancelled', connection)
    await connection.query(
      'UPDATE products SET status = ? WHERE id = ? AND status = ?',
      ['available', order.product_id, 'sold']
    )
  }

  return orders.length
}

async function expirePendingPaymentOrders(connection = null) {
  if (connection) {
    return expireWithConnection(connection)
  }

  const ownConnection = await pool.getConnection()
  try {
    await ownConnection.beginTransaction()
    const expiredCount = await expireWithConnection(ownConnection)
    await ownConnection.commit()
    return expiredCount
  } catch (error) {
    await ownConnection.rollback()
    throw error
  } finally {
    ownConnection.release()
  }
}

module.exports = {
  expirePendingPaymentOrders
}
