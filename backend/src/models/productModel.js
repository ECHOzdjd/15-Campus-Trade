const pool = require('../config/db')
const { getTextVariants, normalizeText } = require('../utils/textEncoding')

function parseImages(images) {
  return typeof images === 'string' ? JSON.parse(images) : (images || [])
}

/**
 * 商品数据模型
 * 负责所有与 products 表相关的数据库操作
 */

/**
 * 获取商品列表（支持搜索、筛选、排序、分页）
 * @param {Object} filters - 查询过滤条件
 * @param {string} [filters.search] - 搜索关键词（标题或描述）
 * @param {string} [filters.category] - 商品分类
 * @param {number} [filters.minPrice] - 最低价格
 * @param {number} [filters.maxPrice] - 最高价格
 * @param {string} [filters.status] - 商品状态
 * @param {string} [filters.sortBy='created_at'] - 排序字段
 * @param {string} [filters.sortOrder='DESC'] - 排序方向
 * @param {number} [filters.page=1] - 页码
 * @param {number} [filters.pageSize=20] - 每页数量
 * @returns {Promise<Object>} { products: Array, total: number }
 */
async function findAll(filters = {}) {
  const {
    search,
    category,
    minPrice,
    maxPrice,
    status = 'available',
    includeRemoved = false,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    page = 1,
    pageSize = 20
  } = filters

  // 构建 WHERE 条件
  const conditions = []
  const params = []

  // 状态过滤
  if (status) {
    conditions.push('p.status = ?')
    params.push(status)
  } else if (!includeRemoved) {
    conditions.push('p.status != ?')
    params.push('removed')
  }

  // 搜索关键词
  if (search) {
    const searchPatterns = getTextVariants(search).map(value => `%${value}%`)
    if (searchPatterns.length > 0) {
      conditions.push(`(${searchPatterns.map(() => '(p.title LIKE ? OR p.description LIKE ?)').join(' OR ')})`)
      searchPatterns.forEach(pattern => {
        params.push(pattern, pattern)
      })
    }
  }

  // 分类过滤
  if (category) {
    const categoryVariants = getTextVariants(category)
    if (categoryVariants.length > 0) {
      conditions.push(`p.category IN (${categoryVariants.map(() => '?').join(', ')})`)
      params.push(...categoryVariants)
    }
  }

  // 价格范围
  if (minPrice !== undefined) {
    conditions.push('p.price >= ?')
    params.push(minPrice)
  }
  if (maxPrice !== undefined) {
    conditions.push('p.price <= ?')
    params.push(maxPrice)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // 验证排序字段（防止 SQL 注入）
  const allowedSortFields = ['created_at', 'price', 'title']
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at'
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

  // 查询总数
  const [countResult] = await pool.query(
    `SELECT COUNT(*) as total FROM products p ${whereClause}`,
    params
  )
  const total = countResult[0].total

  // 查询商品列表（JOIN 卖家信息）
  const offset = (page - 1) * pageSize
  const [rows] = await pool.query(
    `SELECT
      p.id, p.user_id, p.title, p.description, p.price, p.category,
      p.condition, p.images, p.status, p.created_at, p.updated_at,
      u.id as seller_id, u.username as seller_username, u.avatar as seller_avatar
    FROM products p
    LEFT JOIN users u ON p.user_id = u.id
    ${whereClause}
    ORDER BY p.${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  // 处理 JSON 字段和卖家信息
  const products = rows.map(row => ({
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
    updatedAt: row.updated_at
  }))

  return { products, total }
}

/**
 * 根据 ID 获取商品详情
 * @param {number} id - 商品 ID
 * @returns {Promise<Object|null>} 商品对象或 null
 */
async function findById(id) {
  const [rows] = await pool.query(
    `SELECT
      p.id, p.user_id, p.title, p.description, p.price, p.category,
      p.condition, p.images, p.status, p.created_at, p.updated_at,
      u.id as seller_id, u.username as seller_username, u.email as seller_email, u.avatar as seller_avatar
    FROM products p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.id = ?`,
    [id]
  )

  if (rows.length === 0) {
    return null
  }

  const row = rows[0]
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
      email: row.seller_email,
      avatar: row.seller_avatar
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/**
 * 根据用户 ID 获取商品列表
 * @param {number} userId - 用户 ID
 * @returns {Promise<Array>} 商品列表
 */
async function findByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT
      id, user_id, title, description, price, category,
      \`condition\`, images, status, created_at, updated_at
    FROM products
    WHERE user_id = ? AND status != ?
    ORDER BY created_at DESC`,
    [userId, 'removed']
  )

  return rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    title: normalizeText(row.title),
    description: normalizeText(row.description),
    price: parseFloat(row.price),
    category: normalizeText(row.category),
    condition: row.condition,
    images: parseImages(row.images),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

/**
 * 创建新商品
 * @param {Object} productData - 商品数据
 * @returns {Promise<number>} 新商品的 ID
 */
async function create(productData) {
  const { userId, title, description, price, category, condition, images } = productData

  const [result] = await pool.query(
    `INSERT INTO products (user_id, title, description, price, category, \`condition\`, images, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'available')`,
    [userId, title, description, price, category, condition, JSON.stringify(images || [])]
  )

  return result.insertId
}

/**
 * 更新商品信息
 * @param {number} id - 商品 ID
 * @param {Object} updateData - 要更新的数据
 * @returns {Promise<boolean>} 更新成功返回 true
 */
async function update(id, updateData) {
  const fields = []
  const values = []

  if (updateData.title !== undefined) {
    fields.push('title = ?')
    values.push(updateData.title)
  }
  if (updateData.description !== undefined) {
    fields.push('description = ?')
    values.push(updateData.description)
  }
  if (updateData.price !== undefined) {
    fields.push('price = ?')
    values.push(updateData.price)
  }
  if (updateData.category !== undefined) {
    fields.push('category = ?')
    values.push(updateData.category)
  }
  if (updateData.condition !== undefined) {
    fields.push('`condition` = ?')
    values.push(updateData.condition)
  }
  if (updateData.images !== undefined) {
    fields.push('images = ?')
    values.push(JSON.stringify(updateData.images))
  }
  if (updateData.status !== undefined) {
    fields.push('status = ?')
    values.push(updateData.status)
  }

  if (fields.length === 0) {
    return false
  }

  values.push(id)

  const [result] = await pool.query(
    `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
    values
  )

  return result.affectedRows > 0
}

/**
 * 删除商品（软删除，设置状态为 removed）
 * @param {number} id - 商品 ID
 * @returns {Promise<boolean>} 删除成功返回 true
 */
async function deleteProduct(id) {
  const [result] = await pool.query(
    'UPDATE products SET status = ? WHERE id = ?',
    ['removed', id]
  )
  return result.affectedRows > 0
}

/**
 * 更新商品状态
 * @param {number} id - 商品 ID
 * @param {string} status - 新状态（available/sold/removed）
 * @param {Object} [connection] - 数据库连接（用于事务）
 * @returns {Promise<boolean>} 更新成功返回 true
 */
async function updateStatus(id, status, connection = null) {
  const db = connection || pool
  const [result] = await db.query(
    'UPDATE products SET status = ? WHERE id = ?',
    [status, id]
  )
  return result.affectedRows > 0
}

module.exports = {
  findAll,
  findById,
  findByUserId,
  create,
  update,
  delete: deleteProduct,
  updateStatus
}
