jest.mock('../../config/db', () => {
  const mockQuery = jest.fn()
  return { query: mockQuery }
})

const pool = require('../../config/db')
const disputeModel = require('../../models/disputeModel')

describe('disputeModel', () => {
  beforeEach(() => {
    pool.query.mockClear()
  })

  test('create persists dispute evidence images', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 12 }])

    const result = await disputeModel.create({
      orderId: 3,
      openedBy: 2,
      reason: '商品与预期不符',
      evidenceImages: ['/uploads/dispute-1.png'],
    })

    expect(result).toBe(12)
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO disputes'),
      [3, 2, '商品与预期不符', JSON.stringify(['/uploads/dispute-1.png'])]
    )
  })

  test('findAll maps dispute evidence images for admin review', async () => {
    pool.query.mockResolvedValueOnce([[
      {
        id: 7,
        order_id: 21,
        opened_by: 2,
        reason: '商品与预期不符',
        response: '图片里能看到划痕',
        evidence_images: JSON.stringify(['/uploads/buyer-proof.png']),
        response_images: JSON.stringify(['/uploads/detail-proof.png']),
        status: 'responded',
        resolution_note: null,
        created_at: '2026-06-01',
        responded_at: '2026-06-01',
        resolved_at: null,
        order_status: 'disputed',
        product_id: 5,
        product_title: '二手台灯',
        product_price: 30,
        product_status: 'sold',
        buyer_id: 2,
        buyer_username: '买家',
        seller_id: 1,
        seller_username: '卖家',
        opener_id: 2,
        opener_username: '买家',
      },
    ]])

    const result = await disputeModel.findAll({ status: 'responded' })

    expect(result[0].evidenceImages).toEqual(['/uploads/buyer-proof.png'])
    expect(result[0].responseImages).toEqual(['/uploads/detail-proof.png'])
  })
})
