// 模拟数据库 - 实际项目应使用真实数据库
const products = [
  {
    id: 1,
    title: '全新苹果 MacBook Pro',
    description: '14寸屏幕，M2 芯片，1TB 存储，几乎全新',
    price: 5999.99,
    category: 'electronics',
    images: ['http://localhost:3000/uploads/product_1.jpg'],
    status: 'selling',
    sellerId: 1,
    createdAt: new Date('2026-03-15'),
    updatedAt: new Date('2026-03-15'),
  },
  {
    id: 2,
    title: '高等数学教科书',
    description: '非常新，几乎没有使用过',
    price: 29.99,
    category: 'books',
    images: ['http://localhost:3000/uploads/product_2.jpg'],
    status: 'selling',
    sellerId: 1,
    createdAt: new Date('2026-03-10'),
    updatedAt: new Date('2026-03-10'),
  },
]

let nextProductId = 3

// 获取产品列表
async function getList(req, res, next) {
  try {
    const {
      page = 1,
      pageSize = 10,
      search = '',
      category = null,
      minPrice = null,
      maxPrice = null,
      status = null,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query

    let filtered = [...products]

    // 搜索
    if (search) {
      filtered = filtered.filter(
        p => p.title.toLowerCase().includes(search.toLowerCase()) ||
             p.description.toLowerCase().includes(search.toLowerCase())
      )
    }

    // 分类过滤
    if (category) {
      filtered = filtered.filter(p => p.category === category)
    }

    // 价格过滤
    if (minPrice !== null) {
      filtered = filtered.filter(p => p.price >= parseFloat(minPrice))
    }
    if (maxPrice !== null) {
      filtered = filtered.filter(p => p.price <= parseFloat(maxPrice))
    }

    // 状态过滤
    if (status) {
      filtered = filtered.filter(p => p.status === status)
    }

    // 排序
    if (sortBy === 'price') {
      filtered.sort((a, b) => sortOrder === 'asc' ? a.price - b.price : b.price - a.price)
    } else {
      filtered.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime()
        const timeB = new Date(b.createdAt).getTime()
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA
      })
    }

    // 分页
    const pageNum = Math.max(1, parseInt(page))
    const pageSizeNum = Math.max(1, parseInt(pageSize))
    const start = (pageNum - 1) * pageSizeNum
    const items = filtered.slice(start, start + pageSizeNum)

    res.json({
      code: 200,
      message: 'success',
      data: {
        total: filtered.length,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(filtered.length / pageSizeNum),
        items: items.map(p => ({
          ...p,
          seller: { id: p.sellerId, username: '用户' + p.sellerId, avatar: null }
        })),
      },
    })
  } catch (error) {
    next(error)
  }
}

// 获取产品详情
async function getDetail(req, res, next) {
  try {
    const { id } = req.params
    const product = products.find(p => p.id === parseInt(id))

    if (!product) {
      return res.status(404).json({
        code: 404,
        message: '产品不存在',
        data: null,
      })
    }

    res.json({
      code: 200,
      message: 'success',
      data: {
        ...product,
        seller: { id: product.sellerId, username: '用户' + product.sellerId, avatar: null }
      },
    })
  } catch (error) {
    next(error)
  }
}

// 创建产品
async function create(req, res, next) {
  try {
    const { title, description, price, category, images } = req.body

    // 参数验证
    if (!title || !description || !price || !category || !images) {
      return res.status(400).json({
        code: 400,
        message: '参数缺失',
        data: null,
      })
    }

    if (typeof title !== 'string' || title.length < 1 || title.length > 100) {
      return res.status(400).json({
        code: 400,
        message: '标题长度必须在 1-100 之间',
        data: null,
      })
    }

    if (typeof description !== 'string' || description.length < 1 || description.length > 1000) {
      return res.status(400).json({
        code: 400,
        message: '描述长度必须在 1-1000 之间',
        data: null,
      })
    }

    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0.01) {
      return res.status(400).json({
        code: 400,
        message: '价格必须是正数',
        data: null,
      })
    }

    if (!['electronics', 'books', 'furniture', 'clothing', 'other'].includes(category)) {
      return res.status(400).json({
        code: 400,
        message: '分类无效',
        data: null,
      })
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '至少需要 1 张图片',
        data: null,
      })
    }

    const product = {
      id: nextProductId++,
      title,
      description,
      price: priceNum,
      category,
      images,
      status: 'selling',
      sellerId: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    products.push(product)

    res.status(201).json({
      code: 201,
      message: 'success',
      data: {
        ...product,
        seller: { id: req.user.id, username: '用户' + req.user.id, avatar: null }
      },
    })
  } catch (error) {
    next(error)
  }
}

// 更新产品
async function update(req, res, next) {
  try {
    const { id } = req.params
    const { title, description, price, category, images } = req.body

    const product = products.find(p => p.id === parseInt(id))
    if (!product) {
      return res.status(404).json({
        code: 404,
        message: '产品不存在',
        data: null,
      })
    }

    if (product.sellerId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '无权限修改此产品',
        data: null,
      })
    }

    // 参数验证（类似创建）
    if (title !== undefined) product.title = title
    if (description !== undefined) product.description = description
    if (price !== undefined) product.price = parseFloat(price)
    if (category !== undefined) product.category = category
    if (images !== undefined) product.images = images
    product.updatedAt = new Date()

    res.json({
      code: 200,
      message: 'success',
      data: {
        ...product,
        seller: { id: product.sellerId, username: '用户' + product.sellerId, avatar: null }
      },
    })
  } catch (error) {
    next(error)
  }
}

// 删除产品
async function remove(req, res, next) {
  try {
    const { id } = req.params
    const index = products.findIndex(p => p.id === parseInt(id))

    if (index === -1) {
      return res.status(404).json({
        code: 404,
        message: '产品不存在',
        data: null,
      })
    }

    if (products[index].sellerId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '无权限删除此产品',
        data: null,
      })
    }

    products.splice(index, 1)

    res.json({
      code: 200,
      message: 'success',
      data: null,
    })
  } catch (error) {
    next(error)
  }
}

// 获取我的产品列表
async function getMine(req, res, next) {
  try {
    const { page = 1, pageSize = 10 } = req.query

    const userProducts = products.filter(p => p.sellerId === req.user.id)

    const pageNum = Math.max(1, parseInt(page))
    const pageSizeNum = Math.max(1, parseInt(pageSize))
    const start = (pageNum - 1) * pageSizeNum
    const items = userProducts.slice(start, start + pageSizeNum)

    res.json({
      code: 200,
      message: 'success',
      data: {
        total: userProducts.length,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(userProducts.length / pageSizeNum),
        items: items.map(p => ({
          ...p,
          seller: { id: p.sellerId, username: '用户' + p.sellerId, avatar: null }
        })),
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getList,
  getDetail,
  create,
  update,
  remove,
  getMine,
}
