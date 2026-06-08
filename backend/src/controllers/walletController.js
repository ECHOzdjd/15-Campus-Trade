const pool = require('../config/db')
const paymentModel = require('../models/paymentModel')

async function getWallet(req, res, next) {
  try {
    const wallet = await paymentModel.getWallet(req.user.id)

    res.json({
      code: 200,
      message: 'success',
      data: wallet
    })
  } catch (error) {
    next(error)
  }
}

async function recharge(req, res, next) {
  const connection = await pool.getConnection()

  try {
    const amount = Number(req.body.amount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
      return res.status(400).json({
        code: 400,
        message: '充值金额必须在 0 到 10000 之间',
        data: null
      })
    }

    await connection.beginTransaction()
    const wallet = await paymentModel.recharge(req.user.id, amount, connection)
    await connection.commit()

    res.json({
      code: 200,
      message: 'success',
      data: wallet
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}

module.exports = {
  getWallet,
  recharge
}
