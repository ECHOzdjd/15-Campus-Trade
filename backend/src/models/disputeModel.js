const pool = require('../config/db')
const { normalizeText } = require('../utils/textEncoding')

function getDb(connection) {
  return connection || pool
}

function mapDispute(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    openedBy: row.opened_by,
    reason: normalizeText(row.reason),
    response: normalizeText(row.response),
    status: row.status,
    resolutionNote: normalizeText(row.resolution_note),
    createdAt: row.created_at,
    respondedAt: row.responded_at,
    resolvedAt: row.resolved_at
  }
}

async function create({ orderId, openedBy, reason }, connection = null) {
  const db = getDb(connection)
  const [result] = await db.query(
    'INSERT INTO disputes (order_id, opened_by, reason) VALUES (?, ?, ?)',
    [orderId, openedBy, reason]
  )

  return result.insertId
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT id, order_id, opened_by, reason, response, status, resolution_note,
      created_at, responded_at, resolved_at
    FROM disputes
    WHERE id = ?
    LIMIT 1`,
    [id]
  )

  return rows[0] ? mapDispute(rows[0]) : null
}

async function findByIdForUpdate(id, connection) {
  const [rows] = await connection.query(
    `SELECT id, order_id, opened_by, reason, response, status, resolution_note,
      created_at, responded_at, resolved_at
    FROM disputes
    WHERE id = ?
    LIMIT 1
    FOR UPDATE`,
    [id]
  )

  return rows[0] ? mapDispute(rows[0]) : null
}

async function findByOrderId(orderId) {
  const [rows] = await pool.query(
    `SELECT id, order_id, opened_by, reason, response, status, resolution_note,
      created_at, responded_at, resolved_at
    FROM disputes
    WHERE order_id = ?
    ORDER BY created_at DESC, id DESC`,
    [orderId]
  )

  return rows.map(mapDispute)
}

async function findAll(filters = {}) {
  const { status, page = 1, pageSize = 20 } = filters
  const conditions = []
  const params = []

  if (status) {
    conditions.push('d.status = ?')
    params.push(status)
  } else {
    conditions.push("d.status IN ('open', 'responded')")
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * pageSize
  const [rows] = await pool.query(
    `SELECT
      d.id, d.order_id, d.opened_by, d.reason, d.response, d.status, d.resolution_note,
      d.created_at, d.responded_at, d.resolved_at,
      o.status AS order_status,
      p.id AS product_id, p.title AS product_title, p.price AS product_price, p.status AS product_status,
      buyer.id AS buyer_id, buyer.username AS buyer_username,
      seller.id AS seller_id, seller.username AS seller_username,
      opener.id AS opener_id, opener.username AS opener_username
    FROM disputes d
    INNER JOIN orders o ON d.order_id = o.id
    INNER JOIN products p ON o.product_id = p.id
    INNER JOIN users buyer ON o.buyer_id = buyer.id
    INNER JOIN users seller ON o.seller_id = seller.id
    INNER JOIN users opener ON d.opened_by = opener.id
    ${whereClause}
    ORDER BY d.created_at DESC, d.id DESC
    LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  return rows.map(row => ({
    ...mapDispute(row),
    orderStatus: row.order_status,
    product: {
      id: row.product_id,
      title: normalizeText(row.product_title),
      price: parseFloat(row.product_price),
      status: row.product_status
    },
    buyer: {
      id: row.buyer_id,
      username: normalizeText(row.buyer_username)
    },
    seller: {
      id: row.seller_id,
      username: normalizeText(row.seller_username)
    },
    opener: {
      id: row.opener_id,
      username: normalizeText(row.opener_username)
    }
  }))
}

async function respond(id, response, connection = null) {
  const db = getDb(connection)
  await db.query(
    "UPDATE disputes SET response = ?, status = 'responded', responded_at = NOW() WHERE id = ?",
    [response, id]
  )
}

async function resolve(id, status, resolutionNote, connection = null) {
  const db = getDb(connection)
  await db.query(
    'UPDATE disputes SET status = ?, resolution_note = ?, resolved_at = NOW() WHERE id = ?',
    [status, resolutionNote, id]
  )
}

module.exports = {
  create,
  findById,
  findByIdForUpdate,
  findByOrderId,
  findAll,
  respond,
  resolve
}
