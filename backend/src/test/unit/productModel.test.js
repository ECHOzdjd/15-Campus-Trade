// Mock the database pool before requiring productModel
jest.mock('../../config/db', () => {
  const mockQuery = jest.fn()
  return { query: mockQuery }
})

const pool = require('../../config/db')
const productModel = require('../../models/productModel')

describe('productModel', () => {
  beforeEach(() => {
    pool.query.mockClear()
  })

  // 测试1: findAll - 获取商品列表
  test('findAll should return products with pagination', async () => {
    const mockProducts = [
      {
        id: 1,
        user_id: 1,
        title: 'Test Product',
        description: 'Description',
        price: 100.00,
        category: 'Electronics',
        condition: 'new',
        images: JSON.stringify(['img1.jpg']),
        status: 'available',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        seller_id: 1,
        seller_username: 'seller',
        seller_avatar: null
      }
    ]
    pool.query.mockResolvedValueOnce([[{ total: 1 }]]) // count query
    pool.query.mockResolvedValueOnce([mockProducts])   // data query

    const result = await productModel.findAll({ page: 1, pageSize: 10 })

    expect(result.total).toBe(1)
    expect(result.products).toHaveLength(1)
    expect(result.products[0].seller).toEqual({
      id: 1,
      username: 'seller',
      avatar: null
    })
  })

  // 测试2: findAll - 带搜索条件
  test('findAll should apply search filter', async () => {
    pool.query.mockResolvedValueOnce([[{ total: 0 }]])
    pool.query.mockResolvedValueOnce([[]])

    await productModel.findAll({ search: 'phone', page: 1, pageSize: 10 })

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('LIKE'),
      expect.arrayContaining(['%phone%', '%phone%'])
    )
  })

  // 测试3: findById - 找到商品
  test('findById should return product with seller info', async () => {
    const mockProduct = {
      id: 1,
      user_id: 1,
      title: 'Test Product',
      description: 'Description',
      price: 100.00,
      category: 'Electronics',
      condition: 'new',
      images: JSON.stringify(['img1.jpg']),
      status: 'available',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      seller_id: 1,
      seller_username: 'seller',
      seller_email: 'seller@test.com',
      seller_avatar: null
    }
    pool.query.mockResolvedValueOnce([[mockProduct]])  // 返回二维数组

    const result = await productModel.findById(1)

    expect(result).not.toBeNull()
    expect(result.id).toBe(1)
    expect(result.seller.email).toBe('seller@test.com')
    expect(result.images).toEqual(['img1.jpg'])
  })

  // 测试4: findById - 未找到商品
  test('findById should return null when product not found', async () => {
    pool.query.mockResolvedValueOnce([[]])

    const result = await productModel.findById(999)

    expect(result).toBeNull()
  })

  // 测试5: create - 创建商品
  test('create should insert product and return id', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 10 }])

    const productData = {
      userId: 1,
      title: 'New Product',
      description: 'Test',
      price: 99.99,
      category: 'Books',
      condition: 'like_new',
      images: ['img.jpg']
    }

    const result = await productModel.create(productData)

    expect(result).toBe(10)
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO products'),
      expect.arrayContaining([1, 'New Product', 'Test', 99.99, 'Books', 'like_new'])
    )
  })

  // 测试6: update - 更新商品
  test('update should update product fields', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])

    const result = await productModel.update(1, { title: 'Updated Title', price: 150 })

    expect(result).toBe(true)
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE products SET'),
      expect.arrayContaining(['Updated Title', 150, 1])
    )
  })

  // 测试7: delete - 软删除商品
  test('delete should soft delete product by setting status to removed', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])

    const result = await productModel.delete(1)

    expect(result).toBe(true)
    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE products SET status = ? WHERE id = ?',
      ['removed', 1]
    )
  })

  // 测试8: findByUserId - 获取用户的所有商品
  test('findByUserId should return products for a user', async () => {
    const mockProducts = [
      {
        id: 1,
        user_id: 1,
        title: 'Product 1',
        description: 'Desc 1',
        price: 100,
        category: 'Cat1',
        condition: 'new',
        images: null,
        status: 'available',
        created_at: '2026-01-01',
        updated_at: '2026-01-01'
      }
    ]
    pool.query.mockResolvedValueOnce([mockProducts])

    const result = await productModel.findByUserId(1)

    expect(result).toHaveLength(1)
    expect(result[0].userId).toBe(1)
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = ?'),
      [1]
    )
  })
})
