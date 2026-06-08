import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { products } from '../src/api/index.js'
import { useProductStore } from '../src/stores/product.js'

vi.mock('../src/api/index.js', () => ({
  products: {
    getList: vi.fn(),
    getDetail: vi.fn(),
    getMine: vi.fn(),
  },
}))

describe('product store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads product list with query params', async () => {
    const productList = [{ id: 1, title: 'Book' }]
    products.getList.mockResolvedValue({ data: productList })

    const store = useProductStore()
    await store.fetchList({ page: 2, keyword: 'book' })

    expect(products.getList).toHaveBeenCalledWith({ page: 2, keyword: 'book' })
    expect(store.list).toEqual(productList)
  })

  it('loads product detail by id', async () => {
    const detail = { id: 7, title: 'Laptop' }
    products.getDetail.mockResolvedValue({ data: detail })

    const store = useProductStore()
    await store.fetchDetail(7)

    expect(products.getDetail).toHaveBeenCalledWith(7)
    expect(store.detail).toEqual(detail)
  })

  it('loads current user products', async () => {
    const myProducts = [{ id: 3, title: 'Desk Lamp' }]
    products.getMine.mockResolvedValue({ data: myProducts })

    const store = useProductStore()
    await store.fetchMyProducts()

    expect(products.getMine).toHaveBeenCalledWith()
    expect(store.myProducts).toEqual(myProducts)
  })
})
