jest.mock('../../config/db', () => {
  const mockQuery = jest.fn()
  return { query: mockQuery }
})

const pool = require('../../config/db')
const conversationModel = require('../../models/conversationModel')

const decoder = new TextDecoder('windows-1252')
const mojibake = (text) => decoder.decode(Buffer.from(text, 'utf8'))

describe('conversationModel', () => {
  beforeEach(() => {
    pool.query.mockClear()
  })

  test('findOrCreate returns existing conversation for buyer and product', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 12 }]])

    const result = await conversationModel.findOrCreate({ buyerId: 2, productId: 5 })

    expect(result).toBe(12)
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT c.id'),
      [2, 5]
    )
  })

  test('findOrCreate returns conversation created by a concurrent request', async () => {
    const duplicateError = new Error('duplicate conversation')
    duplicateError.code = 'ER_DUP_ENTRY'
    pool.query.mockResolvedValueOnce([[]])
    pool.query.mockRejectedValueOnce(duplicateError)
    pool.query.mockResolvedValueOnce([[{ id: 21 }]])

    const result = await conversationModel.findOrCreate({
      buyerId: 2,
      sellerId: 1,
      productId: 5
    })

    expect(result).toBe(21)
    expect(pool.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('SELECT c.id'),
      [2, 5]
    )
  })

  test('findByIdForUser normalizes product and participant text', async () => {
    pool.query.mockResolvedValueOnce([[{
      id: 1,
      buyer_id: 2,
      seller_id: 1,
      product_id: 3,
      last_message: mojibake('什么时候方便面交？'),
      last_message_at: '2026-05-26',
      created_at: '2026-05-26',
      updated_at: '2026-05-26',
      product_title: mojibake('蓝牙音箱'),
      product_price: 89,
      product_images: JSON.stringify([]),
      buyer_username: mojibake('李明'),
      buyer_avatar: null,
      seller_username: mojibake('王勇'),
      seller_avatar: null
    }]])

    const result = await conversationModel.findByIdForUser(1, 2)

    expect(result.product.title).toBe('蓝牙音箱')
    expect(result.buyer.username).toBe('李明')
    expect(result.seller.username).toBe('王勇')
    expect(result.lastMessage).toBe('什么时候方便面交？')
  })

  test('findMessages normalizes content and sender username', async () => {
    pool.query.mockResolvedValueOnce([[{
      id: 3,
      conversation_id: 1,
      sender_id: 2,
      type: 'text',
      metadata: null,
      content: mojibake('今晚图书馆门口可以吗？'),
      is_read: 0,
      created_at: '2026-05-26',
      sender_username: mojibake('李明'),
      sender_avatar: null
    }]])

    const result = await conversationModel.findMessages(1)

    expect(result[0].content).toBe('今晚图书馆门口可以吗？')
    expect(result[0].sender.username).toBe('李明')
  })

  test('findMessageById maps system messages with system sender', async () => {
    pool.query.mockResolvedValueOnce([[{
      id: 4,
      conversation_id: 1,
      sender_id: null,
      type: 'system',
      metadata: JSON.stringify({ orderId: 9 }),
      content: '订单已创建',
      is_read: 1,
      created_at: '2026-05-26',
      sender_username: null,
      sender_avatar: null
    }]])

    const result = await conversationModel.findMessageById(4)

    expect(result.senderId).toBeNull()
    expect(result.type).toBe('system')
    expect(result.metadata.orderId).toBe(9)
    expect(result.sender).toEqual({ id: null, username: '系统', avatar: null })
  })

  test('createMessage inserts message and updates conversation summary', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 8 }])
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])

    const result = await conversationModel.createMessage({
      conversationId: 1,
      senderId: 2,
      content: '我想买这个商品'
    })

    expect(result).toBe(8)
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO messages'),
      [1, 2, 'text', '我想买这个商品', null, 0]
    )
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE conversations'),
      ['我想买这个商品', 1]
    )
  })

  test('createMessage updates image conversation summary', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 9 }])
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])

    const result = await conversationModel.createMessage({
      conversationId: 1,
      senderId: 2,
      type: 'image',
      content: '/uploads/test-chat-proof.png',
      metadata: { filename: 'test-chat-proof.png' }
    })

    expect(result).toBe(9)
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO messages'),
      [1, 2, 'image', '/uploads/test-chat-proof.png', JSON.stringify({ filename: 'test-chat-proof.png' }), 0]
    )
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE conversations'),
      ['[图片]', 1]
    )
  })

  test('createMessage marks system messages read', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 10 }])
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])

    const result = await conversationModel.createMessage({
      conversationId: 1,
      senderId: null,
      type: 'system',
      content: '订单已创建'
    })

    expect(result).toBe(10)
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO messages'),
      [1, null, 'system', '订单已创建', null, 1]
    )
  })
})
