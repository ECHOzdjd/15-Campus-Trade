jest.mock('../../config/db', () => {
  const mockQuery = jest.fn()
  return { query: mockQuery }
})

const pool = require('../../config/db')
const favoriteModel = require('../../models/favoriteModel')

const decoder = new TextDecoder('windows-1252')
const mojibake = (text) => decoder.decode(Buffer.from(text, 'utf8'))

describe('favoriteModel', () => {
  beforeEach(() => {
    pool.query.mockClear()
  })

  test('findByUser returns normalized favorite products', async () => {
    pool.query.mockResolvedValueOnce([[{
      id: 4,
      title: mojibake('电热水壶'),
      description: mojibake('宿舍常用'),
      price: 42,
      category: mojibake('生活用品'),
      condition: 'good',
      images: JSON.stringify([]),
      status: 'available',
      created_at: '2026-05-26',
      updated_at: '2026-05-26',
      seller_id: 1,
      seller_username: mojibake('王勇'),
      seller_avatar: null,
      favorited_at: '2026-05-26'
    }]])

    const result = await favoriteModel.findByUser(2)

    expect(result[0].title).toBe('电热水壶')
    expect(result[0].category).toBe('生活用品')
    expect(result[0].seller.username).toBe('王勇')
  })

  test('isFavorited returns true when favorite exists', async () => {
    pool.query.mockResolvedValueOnce([[{ total: 1 }]])

    const result = await favoriteModel.isFavorited(2, 4)

    expect(result).toBe(true)
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('COUNT(*)'),
      [2, 4]
    )
  })

  test('isFavorited returns false when favorite does not exist', async () => {
    pool.query.mockResolvedValueOnce([[{ total: 0 }]])

    const result = await favoriteModel.isFavorited(2, 4)

    expect(result).toBe(false)
  })

  test('add inserts favorite and remove deletes favorite', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])

    await favoriteModel.add(2, 4)
    await favoriteModel.remove(2, 4)

    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT IGNORE INTO favorites'),
      [2, 4]
    )
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('DELETE FROM favorites'),
      [2, 4]
    )
  })
})
