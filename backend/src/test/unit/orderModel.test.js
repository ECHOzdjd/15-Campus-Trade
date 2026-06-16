jest.mock('../../config/db', () => {
  const query = jest.fn()
  return { query }
})

const pool = require('../../config/db')
const orderModel = require('../../models/orderModel')

describe('orderModel', () => {
  beforeEach(() => {
    pool.query.mockClear()
  })

  test('create inserts a pending order and returns its id', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 12 }])

    const result = await orderModel.create({
      buyerId: 1,
      sellerId: 2,
      productId: 3
    })

    expect(result).toBe(12)
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO orders'),
      [1, 2, 3]
    )
  })

  test('findAll applies buyer filters and maps the result row', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([[
        {
          id: 1,
          buyer_id: 4,
          seller_id: 2,
          product_id: 3,
          status: 'pending',
          created_at: '2026-01-01',
          updated_at: '2026-01-02',
          product_title: 'Camera',
          product_price: '99.5',
          product_images: JSON.stringify(['image-a.jpg']),
          buyer_username: 'buyer',
          buyer_avatar: null,
          seller_username: 'seller',
          seller_avatar: null
        }
      ]])

    const result = await orderModel.findAll({
      userId: 4,
      role: 'buyer',
      status: 'pending',
      page: 1,
      pageSize: 10
    })

    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('o.buyer_id = ?'),
      [4, 'pending']
    )
    expect(result.total).toBe(1)
    expect(result.orders[0]).toMatchObject({
      id: 1,
      status: 'pending',
      product: {
        id: 3,
        title: 'Camera',
        price: 99.5,
        images: ['image-a.jpg']
      },
      buyer: {
        id: 4,
        username: 'buyer',
        avatar: null
      },
      seller: {
        id: 2,
        username: 'seller',
        avatar: null
      }
    })
  })

  test('findAll applies the any-role user filter when no role is given', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([[]])

    await orderModel.findAll({ userId: 9 })

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('(o.buyer_id = ? OR o.seller_id = ?)'),
      [9, 9]
    )
  })

  test('findAll leaves the query unfiltered when no user filter is provided', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([[]])

    await orderModel.findAll({ page: 2, pageSize: 5 })

    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM orders o'),
      []
    )
  })

  test('findById maps a detailed order row', async () => {
    pool.query.mockResolvedValueOnce([[
      {
        id: 8,
        buyer_id: 4,
        seller_id: 2,
        product_id: 3,
        status: 'paid_escrow',
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
        product_title: 'Camera',
        product_description: 'A used camera',
        product_price: '88.5',
        product_category: 'electronics',
        product_condition: 'good',
        product_images: JSON.stringify(['image-a.jpg', 'image-b.jpg']),
        buyer_username: 'buyer',
        buyer_email: 'buyer@example.com',
        buyer_phone: '123',
        buyer_avatar: null,
        seller_username: 'seller',
        seller_email: 'seller@example.com',
        seller_phone: '456',
        seller_avatar: null
      }
    ]])

    const result = await orderModel.findById(8)

    expect(result).toMatchObject({
      id: 8,
      status: 'paid_escrow',
      product: {
        id: 3,
        title: 'Camera',
        description: 'A used camera',
        price: 88.5,
        category: 'electronics',
        condition: 'good',
        images: ['image-a.jpg', 'image-b.jpg']
      }
    })
  })

  test('findById returns null when the order does not exist', async () => {
    pool.query.mockResolvedValueOnce([[]])

    await expect(orderModel.findById(999)).resolves.toBeNull()
  })

  test('updateStatus reports whether a row changed', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    await expect(orderModel.updateStatus(8, 'confirmed')).resolves.toBe(true)

    pool.query.mockResolvedValueOnce([{ affectedRows: 0 }])
    await expect(orderModel.updateStatus(8, 'confirmed')).resolves.toBe(false)
  })

  test('checkProductAvailability returns the locked product row', async () => {
    const connection = { query: jest.fn().mockResolvedValueOnce([[{ id: 3, user_id: 2, status: 'available' }]]) }

    await expect(orderModel.checkProductAvailability(3, connection)).resolves.toEqual({
      id: 3,
      user_id: 2,
      status: 'available'
    })
  })

  test('checkProductAvailability returns null when nothing is locked', async () => {
    const connection = { query: jest.fn().mockResolvedValueOnce([[]]) }

    await expect(orderModel.checkProductAvailability(3, connection)).resolves.toBeNull()
  })

  test('getProductId returns the product id and null when absent', async () => {
    pool.query.mockResolvedValueOnce([[{ product_id: 22 }]])
    await expect(orderModel.getProductId(9)).resolves.toBe(22)

    pool.query.mockResolvedValueOnce([[]])
    await expect(orderModel.getProductId(9)).resolves.toBeNull()
  })
})
