const pool = require('../config/db')
const { normalizeText } = require('../utils/textEncoding')

function parseImages(images) {
  return typeof images === 'string' ? JSON.parse(images) : (images || [])
}

function mapUser(id, username, avatar) {
  return {
    id,
    username: normalizeText(username),
    avatar
  }
}

function parseMetadata(metadata) {
  if (!metadata) return null
  if (typeof metadata !== 'string') return metadata

  try {
    return JSON.parse(metadata)
  } catch {
    return null
  }
}

function mapConversation(row, currentUserId = null) {
  const buyer = mapUser(row.buyer_id, row.buyer_username, row.buyer_avatar)
  const seller = mapUser(row.seller_id, row.seller_username, row.seller_avatar)

  return {
    id: row.id,
    buyer,
    seller,
    peer: currentUserId === row.buyer_id ? seller : buyer,
    product: {
      id: row.product_id,
      title: normalizeText(row.product_title),
      price: parseFloat(row.product_price),
      images: parseImages(row.product_images)
    },
    lastMessage: normalizeText(row.last_message),
    lastMessageAt: row.last_message_at,
    unreadCount: Number(row.unread_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapMessage(row) {
  const type = row.type || 'text'

  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    type,
    content: normalizeText(row.content),
    metadata: parseMetadata(row.metadata),
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
    sender: type === 'system'
      ? { id: null, username: '系统', avatar: null }
      : mapUser(row.sender_id, row.sender_username, row.sender_avatar)
  }
}

async function findOrCreate({ buyerId, sellerId = null, productId }, connection = null) {
  const db = connection || pool
  const [existingRows] = await db.query(
    'SELECT c.id FROM conversations c WHERE c.buyer_id = ? AND c.product_id = ? LIMIT 1',
    [buyerId, productId]
  )

  if (existingRows.length > 0) {
    return existingRows[0].id
  }

  let targetSellerId = sellerId
  if (!targetSellerId) {
    const [productRows] = await db.query(
      'SELECT user_id FROM products WHERE id = ?',
      [productId]
    )

    if (productRows.length === 0) {
      return null
    }

    targetSellerId = productRows[0].user_id
  }

  try {
    const [result] = await db.query(
      'INSERT INTO conversations (buyer_id, seller_id, product_id) VALUES (?, ?, ?)',
      [buyerId, targetSellerId, productId]
    )

    return result.insertId
  } catch (error) {
    if (error.code !== 'ER_DUP_ENTRY') {
      throw error
    }

    const [raceRows] = await db.query(
      'SELECT c.id FROM conversations c WHERE c.buyer_id = ? AND c.product_id = ? LIMIT 1',
      [buyerId, productId]
    )

    if (raceRows.length > 0) {
      return raceRows[0].id
    }

    throw error
  }
}

async function findAllForUser(userId) {
  const [rows] = await pool.query(
    `SELECT
      c.id, c.buyer_id, c.seller_id, c.product_id, c.last_message, c.last_message_at,
      c.created_at, c.updated_at,
      p.title as product_title, p.price as product_price, p.images as product_images,
      buyer.username as buyer_username, buyer.avatar as buyer_avatar,
      seller.username as seller_username, seller.avatar as seller_avatar,
      (
        SELECT COUNT(*)
        FROM messages m
        WHERE m.conversation_id = c.id AND m.sender_id <> ? AND m.is_read = 0
      ) as unread_count
    FROM conversations c
    LEFT JOIN products p ON c.product_id = p.id
    LEFT JOIN users buyer ON c.buyer_id = buyer.id
    LEFT JOIN users seller ON c.seller_id = seller.id
    WHERE c.buyer_id = ? OR c.seller_id = ?
    ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC`,
    [userId, userId, userId]
  )

  return rows.map(row => mapConversation(row, userId))
}

async function findByIdForUser(id, userId) {
  const [rows] = await pool.query(
    `SELECT
      c.id, c.buyer_id, c.seller_id, c.product_id, c.last_message, c.last_message_at,
      c.created_at, c.updated_at,
      p.title as product_title, p.price as product_price, p.images as product_images,
      buyer.username as buyer_username, buyer.avatar as buyer_avatar,
      seller.username as seller_username, seller.avatar as seller_avatar
    FROM conversations c
    LEFT JOIN products p ON c.product_id = p.id
    LEFT JOIN users buyer ON c.buyer_id = buyer.id
    LEFT JOIN users seller ON c.seller_id = seller.id
    WHERE c.id = ? AND (c.buyer_id = ? OR c.seller_id = ?)
    LIMIT 1`,
    [id, userId, userId]
  )

  return rows[0] ? mapConversation(rows[0], userId) : null
}

async function findMessages(conversationId) {
  const [rows] = await pool.query(
    `SELECT
      m.id, m.conversation_id, m.sender_id, m.type, m.content, m.metadata, m.is_read, m.created_at,
      u.username as sender_username, u.avatar as sender_avatar
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC, m.id ASC`,
    [conversationId]
  )

  return rows.map(mapMessage)
}

async function findMessageById(id) {
  const [rows] = await pool.query(
    `SELECT
      m.id, m.conversation_id, m.sender_id, m.type, m.content, m.metadata, m.is_read, m.created_at,
      u.username as sender_username, u.avatar as sender_avatar
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
    LIMIT 1`,
    [id]
  )

  return rows[0] ? mapMessage(rows[0]) : null
}

async function createMessage({ conversationId, senderId, content, type = 'text', metadata = null }, connection = null) {
  const db = connection || pool
  const metadataValue = metadata === null ? null : JSON.stringify(metadata)
  const lastMessage = type === 'image' ? '[图片]' : content
  const isRead = type === 'system' ? 1 : 0

  const [result] = await db.query(
    'INSERT INTO messages (conversation_id, sender_id, type, content, metadata, is_read) VALUES (?, ?, ?, ?, ?, ?)',
    [conversationId, senderId, type, content, metadataValue, isRead]
  )

  await db.query(
    'UPDATE conversations SET last_message = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
    [lastMessage, conversationId]
  )

  return result.insertId
}

async function findConversationIdByOrderId(orderId, connection = null) {
  const db = connection || pool
  const [rows] = await db.query(
    `SELECT c.id
    FROM orders o
    INNER JOIN conversations c
      ON c.buyer_id = o.buyer_id
      AND c.seller_id = o.seller_id
      AND c.product_id = o.product_id
    WHERE o.id = ?
    LIMIT 1`,
    [orderId]
  )

  return rows[0] ? rows[0].id : null
}

async function markRead(conversationId, userId) {
  const [result] = await pool.query(
    'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id <> ?',
    [conversationId, userId]
  )
  return result.affectedRows
}

module.exports = {
  findOrCreate,
  findAllForUser,
  findByIdForUser,
  findMessages,
  findMessageById,
  createMessage,
  findConversationIdByOrderId,
  markRead
}
