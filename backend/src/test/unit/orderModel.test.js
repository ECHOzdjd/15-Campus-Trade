jest.mock('../../config/db', () => {
  const mockQuery = jest.fn()
  return { query: mockQuery }
})

const pool = require('../../config/db')
const orderModel = require('../../models/orderModel')

const decoder = new TextDecoder('windows-1252')
const mojibake = (text) => decoder.decode(Buffer.from(text, 'utf8'))

describe('orderModel', () => {
  beforeEach(() => {
    pool.query.mockClear()
  })

  test('findAll should normalize product and user text', async () => {
    pool.query.mockResolvedValueOnce([[{ total: 1 }]])
    pool.query.mockResolvedValueOnce([[
      {
        id: 1,
        buyer_id: 1,
        seller_id: 2,
        product_id: 3,
        status: 'pending',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        product_title: mojibake('\u5c0f\u7c73\u624b\u73af7'),
        product_price: 99,
        product_images: JSON.stringify([]),
        buyer_username: mojibake('\u738b\u52c7'),
        buyer_avatar: null,
        seller_username: mojibake('\u5218\u82b3'),
        seller_avatar: null
      }
    ]])

    const result = await orderModel.findAll({ userId: 1, page: 1, pageSize: 10 })

    expect(result.orders[0].product.title).toBe('\u5c0f\u7c73\u624b\u73af7')
    expect(result.orders[0].buyer.username).toBe('\u738b\u52c7')
    expect(result.orders[0].seller.username).toBe('\u5218\u82b3')
  })

  test('findById should normalize product detail and user text', async () => {
    pool.query.mockResolvedValueOnce([[
      {
        id: 1,
        buyer_id: 1,
        seller_id: 2,
        product_id: 3,
        status: 'pending',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        product_title: mojibake('\u53f0\u706f'),
        product_description: mojibake('\u9002\u5408\u5b66\u4e60'),
        product_price: 120,
        product_category: mojibake('\u751f\u6d3b\u7528\u54c1'),
        product_condition: 'good',
        product_images: JSON.stringify([]),
        buyer_username: mojibake('\u738b\u52c7'),
        buyer_email: 'buyer@test.com',
        buyer_phone: null,
        buyer_avatar: null,
        seller_username: mojibake('\u5218\u82b3'),
        seller_email: 'seller@test.com',
        seller_phone: null,
        seller_avatar: null
      }
    ]])

    const result = await orderModel.findById(1)

    expect(result.product.title).toBe('\u53f0\u706f')
    expect(result.product.description).toBe('\u9002\u5408\u5b66\u4e60')
    expect(result.product.category).toBe('\u751f\u6d3b\u7528\u54c1')
    expect(result.buyer.username).toBe('\u738b\u52c7')
    expect(result.seller.username).toBe('\u5218\u82b3')
  })
})
