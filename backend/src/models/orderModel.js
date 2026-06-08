const pool = require('../config/db')
const { normalizeText } = require('../utils/textEncoding')

function parseImages(images) {
  return typeof images === 'string' ? JSON.parse(images) : (images || [])
}

/**
 * 订单数据模型
 * 负责所有与 orders 表相关的数据库操作
 */

/**
 * 创建订单（支持事务）
 * @param {Object} orderData - 订单数据
 * @param {number} orderData.buyerId - 买家 ID
 * @param {number} orderData.sellerId - 卖家 ID
 * @param {number} orderData.productId - 商品 ID
 * @param {Object} [connection] - 数据库连接（用于事务）
 * @returns {Promise<number>} 新订单的 ID
 */
async function create(orderData, connection = null) {
  const { buyerId, sellerId, productId } = orderData
  const db = connection || pool

  const [result] = await db.query(
    `INSERT INTO orders
      (buyer_id, seller_id, product_id, status, payment_expires_at)
    VALUES (?, ?, ?, 'pending_payment', DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
    [buyerId, sellerId, productId]
  )

  return result.insertId
}

function mapEscrow(row) {
  if (!row.escrow_status) {
    return null
  }

  return {
    amount: parseFloat(row.escrow_amount),
    status: row.escrow_status,
    paidAt: row.escrow_paid_at
  }
}

/**
 * 获取订单列表（支持角色和状态过滤）
 * @param {Object} filters - 查询过滤条件
 * @param {number} [filters.userId] - 用户 ID
 * @param {string} [filters.role] - 角色（buyer/seller）
 * @param {string} [filters.status] - 订单状态
 * @param {number} [filters.page=1] - 页码
 * @param {number} [filters.pageSize=20] - 每页数量
 * @returns {Promise<Object>} { orders: Array, total: number }
 */
async function findAll(filters = {}) {
  const {
    userId,
    role,
    status,
    page = 1,
    pageSize = 20
  } = filters

  // 构建 WHERE 条件
  const conditions = []
  const params = []

  // 角色过滤
  if (userId && role === 'buyer') {
    conditions.push('o.buyer_id = ?')
    params.push(userId)
  } else if (userId && role === 'seller') {
    conditions.push('o.seller_id = ?')
    params.push(userId)
  } else if (userId) {
    // 如果没有指定角色，查询用户作为买家或卖家的所有订单
    conditions.push('(o.buyer_id = ? OR o.seller_id = ?)')
    params.push(userId, userId)
  }

  // 状态过滤
  if (status) {
    conditions.push('o.status = ?')
    params.push(status)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // 查询总数
  const [countResult] = await pool.query(
    `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
    params
  )
  const total = countResult[0].total

  // 查询订单列表（JOIN 商品和用户信息）
  const offset = (page - 1) * pageSize
  const [rows] = await pool.query(
    `SELECT
      o.id, o.buyer_id, o.seller_id, o.product_id, o.status, o.created_at, o.updated_at,
      o.payment_expires_at, o.buyer_handoff_confirmed, o.seller_handoff_confirmed,
      p.title as product_title, p.price as product_price, p.images as product_images,
      buyer.username as buyer_username, buyer.avatar as buyer_avatar,
      seller.username as seller_username, seller.avatar as seller_avatar,
      e.amount as escrow_amount, e.status as escrow_status, e.paid_at as escrow_paid_at
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN users buyer ON o.buyer_id = buyer.id
    LEFT JOIN users seller ON o.seller_id = seller.id
    LEFT JOIN payment_escrows e ON o.id = e.order_id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  // 处理 JSON 字段
  const orders = rows.map(row => ({
    id: row.id,
    status: row.status,
    paymentExpiresAt: row.payment_expires_at,
    buyerHandoffConfirmed: Boolean(row.buyer_handoff_confirmed),
    sellerHandoffConfirmed: Boolean(row.seller_handoff_confirmed),
    escrow: mapEscrow(row),
    product: {
      id: row.product_id,
      title: normalizeText(row.product_title),
      price: parseFloat(row.product_price),
      images: parseImages(row.product_images)
    },
    buyer: {
      id: row.buyer_id,
      username: normalizeText(row.buyer_username),
      avatar: row.buyer_avatar
    },
    seller: {
      id: row.seller_id,
      username: normalizeText(row.seller_username),
      avatar: row.seller_avatar
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))

  return { orders, total }
}

/**
 * 根据 ID 获取订单详情
 * @param {number} id - 订单 ID
 * @returns {Promise<Object|null>} 订单对象或 null
 */
async function findById(id) {
  const [rows] = await pool.query(
    `SELECT
      o.id, o.buyer_id, o.seller_id, o.product_id, o.status, o.created_at, o.updated_at,
      o.payment_expires_at, o.buyer_handoff_confirmed, o.seller_handoff_confirmed,
      p.title as product_title, p.description as product_description,
      p.price as product_price, p.category as product_category,
      p.condition as product_condition, p.images as product_images,
      buyer.username as buyer_username, buyer.email as buyer_email,
      buyer.phone as buyer_phone, buyer.avatar as buyer_avatar,
      seller.username as seller_username, seller.email as seller_email,
      seller.phone as seller_phone, seller.avatar as seller_avatar,
      e.amount as escrow_amount, e.status as escrow_status, e.paid_at as escrow_paid_at
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN users buyer ON o.buyer_id = buyer.id
    LEFT JOIN users seller ON o.seller_id = seller.id
    LEFT JOIN payment_escrows e ON o.id = e.order_id
    WHERE o.id = ?`,
    [id]
  )

  if (rows.length === 0) {
    return null
  }

  const row = rows[0]
  return {
    id: row.id,
    status: row.status,
    paymentExpiresAt: row.payment_expires_at,
    buyerHandoffConfirmed: Boolean(row.buyer_handoff_confirmed),
    sellerHandoffConfirmed: Boolean(row.seller_handoff_confirmed),
    escrow: mapEscrow(row),
    product: {
      id: row.product_id,
      title: normalizeText(row.product_title),
      description: normalizeText(row.product_description),
      price: parseFloat(row.product_price),
      category: normalizeText(row.product_category),
      condition: row.product_condition,
      images: parseImages(row.product_images)
    },
    buyer: {
      id: row.buyer_id,
      username: normalizeText(row.buyer_username),
      email: row.buyer_email,
      phone: row.buyer_phone,
      avatar: row.buyer_avatar
    },
    seller: {
      id: row.seller_id,
      username: normalizeText(row.seller_username),
      email: row.seller_email,
      phone: row.seller_phone,
      avatar: row.seller_avatar
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/**
 * 更新订单状态
 * @param {number} id - 订单 ID
 * @param {string} status - 新状态（pending/confirmed/cancelled）
 * @param {Object} [connection] - 数据库连接（用于事务）
 * @returns {Promise<boolean>} 更新成功返回 true
 */
async function updateStatus(id, status, connection = null) {
  const db = connection || pool
  const [result] = await db.query(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, id]
  )
  return result.affectedRows > 0
}

/**
 * 检查商品是否可购买
 * @param {number} productId - 商品 ID
 * @param {Object} [connection] - 数据库连接（用于事务）
 * @returns {Promise<Object|null>} 商品信息或 null
 */
async function checkProductAvailability(productId, connection = null) {
  const db = connection || pool
  const [rows] = await db.query(
    'SELECT id, user_id, status FROM products WHERE id = ? FOR UPDATE',
    [productId]
  )
  return rows[0] || null
}

/**
 * 获取订单的商品 ID
 * @param {number} orderId - 订单 ID
 * @returns {Promise<number|null>} 商品 ID 或 null
 */
async function getProductId(orderId) {
  const [rows] = await pool.query(
    'SELECT product_id FROM orders WHERE id = ?',
    [orderId]
  )
  return rows[0] ? rows[0].product_id : null
}

async function markBuyerHandoffConfirmed(id, connection = null) {
  const db = connection || pool
  const [result] = await db.query(
    'UPDATE orders SET buyer_handoff_confirmed = 1 WHERE id = ?',
    [id]
  )
  return result.affectedRows > 0
}

async function markSellerHandoffConfirmed(id, connection = null) {
  const db = connection || pool
  const [result] = await db.query(
    'UPDATE orders SET seller_handoff_confirmed = 1 WHERE id = ?',
    [id]
  )
  return result.affectedRows > 0
}

async function findExpiredPendingPayments(connection = null) {
  const db = connection || pool
  const [rows] = await db.query(
    `SELECT id, product_id
    FROM orders
    WHERE status = 'pending_payment'
      AND payment_expires_at IS NOT NULL
      AND payment_expires_at <= NOW()
    FOR UPDATE`
  )
  return rows
}

module.exports = {
  create,
  findAll,
  findById,
  updateStatus,
  checkProductAvailability,
  getProductId,
  markBuyerHandoffConfirmed,
  markSellerHandoffConfirmed,
  findExpiredPendingPayments
}
