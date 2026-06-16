jest.mock('../../models/productModel', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByUserId: jest.fn(),
}))

const productModel = require('../../models/productModel')
const productsController = require('../../controllers/productsController')

function createRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('productsController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('getList normalizes filters and returns mapped products', async () => {
    productModel.findAll.mockResolvedValueOnce({
      products: [{ id: 1 }],
      total: 1,
    })
    const req = {
      query: {
        page: '0',
        pageSize: '200',
        search: '',
        category: '',
        minPrice: '12.34',
        maxPrice: '99.99',
        status: 'available',
        sortBy: 'price',
        sortOrder: 'asc',
      },
    }
    const res = createRes()
    const next = jest.fn()

    await productsController.getList(req, res, next)

    expect(productModel.findAll).toHaveBeenCalledWith({
      search: undefined,
      category: undefined,
      minPrice: 12.34,
      maxPrice: 99.99,
      status: 'available',
      sortBy: 'price',
      sortOrder: 'ASC',
      page: 1,
      pageSize: 100,
    })
    expect(res.json).toHaveBeenCalledWith({
      code: 200,
      message: 'success',
      data: {
        products: [{ id: 1 }],
        total: 1,
        page: 1,
        pageSize: 100,
      },
    })
    expect(next).not.toHaveBeenCalled()
  })

  test('getList forwards unexpected errors', async () => {
    const error = new Error('boom')
    productModel.findAll.mockRejectedValueOnce(error)
    const next = jest.fn()

    await productsController.getList({ query: {} }, createRes(), next)

    expect(next).toHaveBeenCalledWith(error)
  })

  test('getDetail returns 404 when product is missing or removed', async () => {
    const resMissing = createRes()
    productModel.findById.mockResolvedValueOnce(null)

    await productsController.getDetail({ params: { id: '7' } }, resMissing, jest.fn())

    expect(resMissing.status).toHaveBeenCalledWith(404)

    const resRemoved = createRes()
    productModel.findById.mockResolvedValueOnce({ status: 'removed' })

    await productsController.getDetail({ params: { id: '7' } }, resRemoved, jest.fn())

    expect(resRemoved.status).toHaveBeenCalledWith(404)
  })

  test('getDetail returns product data', async () => {
    productModel.findById.mockResolvedValueOnce({ id: 7, status: 'available' })
    const res = createRes()

    await productsController.getDetail({ params: { id: '7' } }, res, jest.fn())

    expect(res.json).toHaveBeenCalledWith({
      code: 200,
      message: 'success',
      data: { id: 7, status: 'available' },
    })
  })

  test('create rejects invalid payloads', async () => {
    const cases = [
      [{ body: {} }, '标题、价格、分类和成色不能为空'],
      [{ body: { title: '', price: 1, category: 'x', condition: 'new' } }, '标题长度必须在1-100之间'],
      [{ body: { title: 'ok', price: '0', category: 'x', condition: 'new' } }, '价格必须是正数'],
      [{ body: { title: 'ok', price: 1, category: 'x', condition: 'bad' } }, '成色无效'],
      [{ body: { title: 'ok', price: 1, category: 'x', condition: 'new', images: [1, 2, 3, 4, 5, 6] } }, '图片数量不能超过 5 张'],
    ]

    for (const [req] of cases) {
      const res = createRes()
      await productsController.create({ user: { id: 1 }, ...req }, res, jest.fn())
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json.mock.calls.at(-1)[0]).toMatchObject({ code: 400, data: null })
    }
  })

  test('create persists the product and returns the fresh row', async () => {
    productModel.create.mockResolvedValueOnce(11)
    productModel.findById.mockResolvedValueOnce({ id: 11, title: 'Lamp' })
    const res = createRes()

    await productsController.create({
      user: { id: 2 },
      body: {
        title: 'Lamp',
        description: '',
        price: '12.50',
        category: 'books',
        condition: 'good',
        images: ['/uploads/a.png'],
      },
    }, res, jest.fn())

    expect(productModel.create).toHaveBeenCalledWith({
      userId: 2,
      title: 'Lamp',
      description: '',
      price: 12.5,
      category: 'books',
      condition: 'good',
      images: ['/uploads/a.png'],
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      code: 201,
      message: 'success',
      data: { id: 11, title: 'Lamp' },
    })
  })

  test('update enforces ownership and returns the updated row', async () => {
    productModel.findById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 9, seller: { id: 3 } })
      .mockResolvedValueOnce({ id: 9, seller: { id: 1 } })
      .mockResolvedValueOnce({ id: 9, seller: { id: 1 }, title: 'Updated' })

    const notFoundRes = createRes()
    await productsController.update({ params: { id: '9' }, user: { id: 1 }, body: {} }, notFoundRes, jest.fn())
    expect(notFoundRes.status).toHaveBeenCalledWith(404)

    const forbiddenRes = createRes()
    await productsController.update({ params: { id: '9' }, user: { id: 1 }, body: {} }, forbiddenRes, jest.fn())
    expect(forbiddenRes.status).toHaveBeenCalledWith(403)

    const okRes = createRes()
    await productsController.update({ params: { id: '9' }, user: { id: 1 }, body: { title: 'Updated' } }, okRes, jest.fn())

    expect(productModel.update).toHaveBeenCalledWith(9, { title: 'Updated' })
    expect(okRes.json).toHaveBeenCalledWith({
      code: 200,
      message: 'success',
      data: { id: 9, seller: { id: 1 }, title: 'Updated' },
    })
  })

  test('remove enforces ownership and deletes the product', async () => {
    productModel.findById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 12, seller: { id: 3 } })
      .mockResolvedValueOnce({ id: 12, seller: { id: 1 } })

    const notFoundRes = createRes()
    await productsController.remove({ params: { id: '12' }, user: { id: 1 } }, notFoundRes, jest.fn())
    expect(notFoundRes.status).toHaveBeenCalledWith(404)

    const forbiddenRes = createRes()
    await productsController.remove({ params: { id: '12' }, user: { id: 1 } }, forbiddenRes, jest.fn())
    expect(forbiddenRes.status).toHaveBeenCalledWith(403)

    const okRes = createRes()
    await productsController.remove({ params: { id: '12' }, user: { id: 1 } }, okRes, jest.fn())

    expect(productModel.delete).toHaveBeenCalledWith(12)
    expect(okRes.json).toHaveBeenCalledWith({
      code: 200,
      message: 'success',
      data: null,
    })
  })

  test('getMine returns the current seller product list', async () => {
    productModel.findByUserId.mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
    const res = createRes()

    await productsController.getMine({ user: { id: 8 } }, res, jest.fn())

    expect(productModel.findByUserId).toHaveBeenCalledWith(8)
    expect(res.json).toHaveBeenCalledWith({
      code: 200,
      message: 'success',
      data: {
        products: [{ id: 1 }, { id: 2 }],
        total: 2,
      },
    })
  })
})
