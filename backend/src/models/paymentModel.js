const pool = require('../config/db')

function formatMoney(value) {
  const raw = String(value).trim()
  const sign = raw.startsWith('-') ? -1 : 1
  const unsigned = raw.replace(/^[+-]/, '')
  const [integerPart, decimalPart = ''] = unsigned.split('.')
  const centsText = decimalPart.padEnd(3, '0')
  const baseCents = Number(integerPart || '0') * 100 + Number(centsText.slice(0, 2))
  const roundedCents = baseCents + (Number(centsText[2]) >= 5 ? 1 : 0)

  return (sign * roundedCents) / 100
}

function assertSufficientBalance(balance, amount) {
  if (formatMoney(balance) < formatMoney(amount)) {
    throw new Error('INSUFFICIENT_BALANCE')
  }
}

function getDb(connection) {
  return connection || pool
}

async function ensureWallet(userId, connection = null) {
  const db = getDb(connection)
  await db.query(
    'INSERT IGNORE INTO wallets (user_id, balance, frozen_balance) VALUES (?, 0.00, 0.00)',
    [userId]
  )
}

async function lockWallet(userId, connection) {
  await ensureWallet(userId, connection)
  const [rows] = await connection.query(
    'SELECT user_id, balance, frozen_balance FROM wallets WHERE user_id = ? FOR UPDATE',
    [userId]
  )
  return rows[0]
}

async function addTransaction(connection, data) {
  await connection.query(
    `INSERT INTO wallet_transactions
      (user_id, order_id, type, direction, amount, balance_after, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.userId,
      data.orderId || null,
      data.type,
      data.direction,
      formatMoney(data.amount),
      formatMoney(data.balanceAfter),
      data.note
    ]
  )
}

function mapTransaction(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    type: row.type,
    direction: row.direction,
    amount: formatMoney(row.amount),
    balanceAfter: formatMoney(row.balance_after),
    note: row.note,
    createdAt: row.created_at
  }
}

async function getWallet(userId) {
  await ensureWallet(userId)
  return getWalletData(userId, pool)
}

async function getWalletData(userId, db) {
  const [walletRows] = await db.query(
    'SELECT balance, frozen_balance FROM wallets WHERE user_id = ?',
    [userId]
  )
  const [transactionRows] = await db.query(
    `SELECT id, order_id, type, direction, amount, balance_after, note, created_at
    FROM wallet_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 30`,
    [userId]
  )

  return {
    balance: formatMoney(walletRows[0].balance),
    frozenBalance: formatMoney(walletRows[0].frozen_balance),
    transactions: transactionRows.map(mapTransaction)
  }
}

async function rechargeWithConnection(connection, userId, amount) {
  const wallet = await lockWallet(userId, connection)
  const balanceAfter = formatMoney(formatMoney(wallet.balance) + formatMoney(amount))

  await connection.query(
    'UPDATE wallets SET balance = ? WHERE user_id = ?',
    [formatMoney(balanceAfter), userId]
  )
  await addTransaction(connection, {
    userId,
    type: 'recharge',
    direction: 'in',
    amount,
    balanceAfter,
    note: '模拟充值'
  })

  return getWalletData(userId, connection)
}

async function recharge(userId, amount, connection = null) {
  if (connection) {
    return rechargeWithConnection(connection, userId, amount)
  }

  const ownConnection = await pool.getConnection()
  try {
    await ownConnection.beginTransaction()
    await rechargeWithConnection(ownConnection, userId, amount)
    await ownConnection.commit()
    return getWallet(userId)
  } catch (error) {
    await ownConnection.rollback()
    throw error
  } finally {
    ownConnection.release()
  }
}

async function payToEscrow(connection, order) {
  const amount = formatMoney(order.product.price)
  const buyerId = order.buyer.id
  const wallet = await lockWallet(buyerId, connection)

  assertSufficientBalance(wallet.balance, amount)
  const balanceAfter = formatMoney(formatMoney(wallet.balance) - amount)

  await connection.query(
    'UPDATE wallets SET balance = ? WHERE user_id = ?',
    [formatMoney(balanceAfter), buyerId]
  )
  await addTransaction(connection, {
    userId: buyerId,
    orderId: order.id,
    type: 'escrow_pay',
    direction: 'out',
    amount,
    balanceAfter,
    note: '支付到平台托管'
  })
  await connection.query(
    `INSERT INTO payment_escrows
      (order_id, buyer_id, seller_id, amount, status, paid_at)
    VALUES (?, ?, ?, ?, 'held', NOW())`,
    [order.id, buyerId, order.seller.id, amount]
  )
}

async function findActiveEscrow(connection, orderId) {
  const [rows] = await connection.query(
    `SELECT id, buyer_id, seller_id, amount
    FROM payment_escrows
    WHERE order_id = ? AND status IN ('held', 'disputed')
    FOR UPDATE`,
    [orderId]
  )
  if (!rows[0]) {
    throw new Error('ESCROW_NOT_FOUND')
  }
  return rows[0]
}

async function releaseEscrow(connection, order) {
  const escrow = await findActiveEscrow(connection, order.id)
  const wallet = await lockWallet(escrow.seller_id, connection)
  const amount = formatMoney(escrow.amount)
  const balanceAfter = formatMoney(formatMoney(wallet.balance) + amount)

  await connection.query(
    'UPDATE wallets SET balance = ? WHERE user_id = ?',
    [formatMoney(balanceAfter), escrow.seller_id]
  )
  await addTransaction(connection, {
    userId: escrow.seller_id,
    orderId: order.id,
    type: 'escrow_release',
    direction: 'in',
    amount,
    balanceAfter,
    note: '平台托管放款'
  })
  await connection.query(
    "UPDATE payment_escrows SET status = 'released', released_at = NOW() WHERE id = ?",
    [escrow.id]
  )
}

async function refundEscrow(connection, order) {
  const escrow = await findActiveEscrow(connection, order.id)
  const wallet = await lockWallet(escrow.buyer_id, connection)
  const amount = formatMoney(escrow.amount)
  const balanceAfter = formatMoney(formatMoney(wallet.balance) + amount)

  await connection.query(
    'UPDATE wallets SET balance = ? WHERE user_id = ?',
    [formatMoney(balanceAfter), escrow.buyer_id]
  )
  await addTransaction(connection, {
    userId: escrow.buyer_id,
    orderId: order.id,
    type: 'refund',
    direction: 'in',
    amount,
    balanceAfter,
    note: '平台托管退款'
  })
  await connection.query(
    "UPDATE payment_escrows SET status = 'refunded', refunded_at = NOW() WHERE id = ?",
    [escrow.id]
  )
}

module.exports = {
  formatMoney,
  assertSufficientBalance,
  ensureWallet,
  getWallet,
  recharge,
  payToEscrow,
  releaseEscrow,
  refundEscrow
}
