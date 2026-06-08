import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { orders } from '../src/api/index.js'
import { useOrderStore } from '../src/stores/order.js'

vi.mock('../src/api/index.js', () => ({
  orders: {
    getList: vi.fn(),
    getDetail: vi.fn(),
  },
}))

describe('order store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads order list', async () => {
    const orderList = [{ id: 1, status: 'pending' }]
    orders.getList.mockResolvedValue({ data: orderList })

    const store = useOrderStore()
    await store.fetchList()

    expect(orders.getList).toHaveBeenCalledWith()
    expect(store.list).toEqual(orderList)
  })

  it('loads order detail by id', async () => {
    const detail = { id: 8, status: 'completed' }
    orders.getDetail.mockResolvedValue({ data: detail })

    const store = useOrderStore()
    await store.fetchDetail(8)

    expect(orders.getDetail).toHaveBeenCalledWith(8)
    expect(store.detail).toEqual(detail)
  })
})
