const pool = require('../config/db')
const { normalizeText } = require('../utils/textEncoding')

function normalizeUser(user) {
  if (!user) {
    return null
  }

  return {
    ...user,
    username: normalizeText(user.username)
  }
}

/**
 * 用户数据模型
 * 负责所有与 users 表相关的数据库操作
 */

/**
 * 根据邮箱查找用户
 * @param {string} email - 用户邮箱
 * @returns {Promise<Object|null>} 用户对象或 null
 */
async function findByEmail(email) {
  const [rows] = await pool.query(
    'SELECT id, username, email, password, phone, avatar, created_at, updated_at FROM users WHERE email = ?',
    [email]
  )
  return normalizeUser(rows[0])
}

/**
 * 根据用户名查找用户
 * @param {string} username - 用户名
 * @returns {Promise<Object|null>} 用户对象或 null
 */
async function findByUsername(username) {
  const [rows] = await pool.query(
    'SELECT id, username, email, password, phone, avatar, created_at, updated_at FROM users WHERE username = ?',
    [username]
  )
  return normalizeUser(rows[0])
}

/**
 * 根据 ID 查找用户
 * @param {number} id - 用户 ID
 * @returns {Promise<Object|null>} 用户对象（不含密码）或 null
 */
async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, username, email, phone, avatar, created_at, updated_at FROM users WHERE id = ?',
    [id]
  )
  return normalizeUser(rows[0])
}

/**
 * 检查邮箱是否已存在
 * @param {string} email - 用户邮箱
 * @returns {Promise<boolean>} 存在返回 true，否则返回 false
 */
async function checkEmailExists(email) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) as count FROM users WHERE email = ?',
    [email]
  )
  return rows[0].count > 0
}

/**
 * 检查用户名是否已存在
 * @param {string} username - 用户名
 * @returns {Promise<boolean>} 存在返回 true，否则返回 false
 */
async function checkUsernameExists(username) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) as count FROM users WHERE username = ?',
    [username]
  )
  return rows[0].count > 0
}

/**
 * 创建新用户
 * @param {Object} userData - 用户数据
 * @param {string} userData.username - 用户名
 * @param {string} userData.email - 邮箱
 * @param {string} userData.password - 已哈希的密码
 * @param {string} [userData.phone] - 手机号（可选）
 * @param {string} [userData.avatar] - 头像 URL（可选）
 * @returns {Promise<number>} 新用户的 ID
 */
async function create({ username, email, password, phone = null, avatar = null }) {
  const [result] = await pool.query(
    'INSERT INTO users (username, email, password, phone, avatar) VALUES (?, ?, ?, ?, ?)',
    [username, email, password, phone, avatar]
  )
  return result.insertId
}

/**
 * 更新用户密码
 * @param {number} userId - 用户 ID
 * @param {string} hashedPassword - 新的哈希密码
 * @returns {Promise<boolean>} 更新成功返回 true
 */
async function updatePassword(userId, hashedPassword) {
  const [result] = await pool.query(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashedPassword, userId]
  )
  return result.affectedRows > 0
}

/**
 * 更新用户信息
 * @param {number} userId - 用户 ID
 * @param {Object} updateData - 要更新的数据
 * @returns {Promise<boolean>} 更新成功返回 true
 */
async function update(userId, updateData) {
  const fields = []
  const values = []

  if (updateData.username !== undefined) {
    fields.push('username = ?')
    values.push(updateData.username)
  }
  if (updateData.phone !== undefined) {
    fields.push('phone = ?')
    values.push(updateData.phone)
  }
  if (updateData.avatar !== undefined) {
    fields.push('avatar = ?')
    values.push(updateData.avatar)
  }

  if (fields.length === 0) {
    return false
  }

  values.push(userId)

  const [result] = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  )
  return result.affectedRows > 0
}

module.exports = {
  findByEmail,
  findByUsername,
  findById,
  checkEmailExists,
  checkUsernameExists,
  create,
  updatePassword,
  update
}
