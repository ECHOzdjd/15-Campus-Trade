const pool = require('../config/db')
const { normalizeText } = require('../utils/textEncoding')

function parseImages(images) {
  return typeof images === 'string' ? JSON.parse(images) : (images || [])
}

function mapProduct(row) {
  return {
    id: row.id,
    title: normalizeText(row.title),
    description: normalizeText(row.description),
    price: parseFloat(row.price),
    category: normalizeText(row.category),
    condition: row.condition,
    images: parseImages(row.images),
    status: row.status,
    seller: {
      id: row.seller_id,
      username: normalizeText(row.seller_username),
      avatar: row.seller_avatar
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    favoritedAt: row.favorited_at
  }
}

async function findByUser(userId) {
  const [rows] = await pool.query(
    `SELECT
      p.id, p.title, p.description, p.price, p.category, p.condition,
      p.images, p.status, p.created_at, p.updated_at,
      u.id as seller_id, u.username as seller_username, u.avatar as seller_avatar,
      f.created_at as favorited_at
    FROM favorites f
    INNER JOIN products p ON f.product_id = p.id
    LEFT JOIN users u ON p.user_id = u.id
    WHERE f.user_id = ? AND p.status != 'removed'
    ORDER BY f.created_at DESC`,
    [userId]
  )

  return rows.map(mapProduct)
}

async function isFavorited(userId, productId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) as total FROM favorites WHERE user_id = ? AND product_id = ?',
    [userId, productId]
  )
  return rows[0].total > 0
}

async function add(userId, productId) {
  const [result] = await pool.query(
    'INSERT IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)',
    [userId, productId]
  )
  return result.affectedRows >= 0
}

async function remove(userId, productId) {
  const [result] = await pool.query(
    'DELETE FROM favorites WHERE user_id = ? AND product_id = ?',
    [userId, productId]
  )
  return result.affectedRows > 0
}

module.exports = {
  findByUser,
  isFavorited,
  add,
  remove
}
