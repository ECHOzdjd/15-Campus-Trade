const jwt = require('jsonwebtoken')
const conversationModel = require('../models/conversationModel')
const productModel = require('../models/productModel')
const conversationEvents = require('../services/conversationEvents')

function isValidUploadedImagePath(content) {
  if (typeof content !== 'string' || /%2f|%5c/i.test(content)) {
    return false
  }

  const match = content.match(/^\/uploads\/([^/\\]+)\.([a-z0-9]+)$/i)
  if (!match) return false

  const filename = match[1]
  const ext = match[2].toLowerCase()
  return !filename.includes('..') && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
}

async function create(req, res, next) {
  try {
    const productId = parseInt(req.body.productId)
    if (!productId) {
      return res.status(400).json({ code: 400, message: '商品ID不能为空', data: null })
    }

    const product = await productModel.findById(productId)
    if (!product) {
      return res.status(404).json({ code: 404, message: '商品不存在', data: null })
    }

    if (product.seller.id === req.user.id) {
      return res.status(400).json({ code: 400, message: '不能联系自己的商品', data: null })
    }

    const conversationId = await conversationModel.findOrCreate({
      buyerId: req.user.id,
      sellerId: product.seller.id,
      productId
    })
    const conversation = await conversationModel.findByIdForUser(conversationId, req.user.id)

    res.status(201).json({ code: 201, message: 'success', data: conversation })
  } catch (error) {
    next(error)
  }
}

async function getList(req, res, next) {
  try {
    const conversations = await conversationModel.findAllForUser(req.user.id)
    res.json({
      code: 200,
      message: 'success',
      data: {
        conversations,
        total: conversations.length
      }
    })
  } catch (error) {
    next(error)
  }
}

async function getDetail(req, res, next) {
  try {
    const conversation = await conversationModel.findByIdForUser(parseInt(req.params.id), req.user.id)
    if (!conversation) {
      return res.status(404).json({ code: 404, message: '会话不存在', data: null })
    }

    const messages = await conversationModel.findMessages(conversation.id)
    res.json({
      code: 200,
      message: 'success',
      data: {
        conversation,
        messages
      }
    })
  } catch (error) {
    next(error)
  }
}

async function sendMessage(req, res, next) {
  try {
    const conversationId = parseInt(req.params.id)
    const type = String(req.body.type || 'text').trim()
    if (typeof req.body.content !== 'string') {
      return res.status(400).json({ code: 400, message: '消息内容不能为空', data: null })
    }

    const content = req.body.content.trim()
    const metadata = req.body.metadata || null

    if (!['text', 'image'].includes(type)) {
      return res.status(400).json({ code: 400, message: '消息类型不支持', data: null })
    }

    if (!content) {
      return res.status(400).json({ code: 400, message: '消息内容不能为空', data: null })
    }

    if (type === 'image' && !isValidUploadedImagePath(content)) {
      return res.status(400).json({ code: 400, message: '图片消息必须来自上传接口', data: null })
    }

    const conversation = await conversationModel.findByIdForUser(conversationId, req.user.id)
    if (!conversation) {
      return res.status(404).json({ code: 404, message: '会话不存在', data: null })
    }

    const messageId = await conversationModel.createMessage({
      conversationId,
      senderId: req.user.id,
      content,
      type,
      metadata
    })
    const message = await conversationModel.findMessageById(messageId)

    conversationEvents.notifyClients(conversationId, message)
    res.status(201).json({ code: 201, message: 'success', data: message })
  } catch (error) {
    next(error)
  }
}

async function markRead(req, res, next) {
  try {
    const conversationId = parseInt(req.params.id)
    const conversation = await conversationModel.findByIdForUser(conversationId, req.user.id)
    if (!conversation) {
      return res.status(404).json({ code: 404, message: '会话不存在', data: null })
    }

    await conversationModel.markRead(conversationId, req.user.id)
    res.json({ code: 200, message: 'success', data: null })
  } catch (error) {
    next(error)
  }
}

async function stream(req, res, next) {
  try {
    const conversationId = parseInt(req.params.id)
    const conversation = await conversationModel.findByIdForUser(conversationId, req.user.id)
    if (!conversation) {
      return res.status(404).json({ code: 404, message: '会话不存在', data: null })
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    })
    res.write('event: connected\n')
    res.write(`data: ${JSON.stringify({ conversationId })}\n\n`)

    conversationEvents.addClient(conversationId, res)
    const cleanup = () => conversationEvents.removeClient(conversationId, res)
    req.on('close', cleanup)
    res.on('close', cleanup)
    res.on('error', cleanup)
  } catch (error) {
    next(error)
  }
}

function streamAuth(req, res, next) {
  const header = req.headers.authorization
  const token = req.query.token || (header && header.startsWith('Bearer ') ? header.split(' ')[1] : '')

  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录，请先登录', data: null })
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ code: 401, message: 'Token 无效或已过期', data: null })
  }
}

module.exports = {
  create,
  getList,
  getDetail,
  sendMessage,
  markRead,
  stream,
  streamAuth
}
