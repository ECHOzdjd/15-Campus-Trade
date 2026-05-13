import request from '../utils/request.js'

// ===== 认证模块 =====
export const auth = {
  // 用户注册
  register: (data) => request.post('/auth/register', data),

  // 用户登录
  login: (data) => request.post('/auth/login', data),

  // 获取当前用户信息
  getMe: () => request.get('/auth/me'),

  // 修改密码
  updatePassword: (data) => request.put('/auth/password', data),
}

// ===== 商品模块 =====
export const products = {
  // 获取产品列表（支持分页、搜索、筛选、排序）
  // params: { page, pageSize, search, category, minPrice, maxPrice, status, sortBy, sortOrder }
  getList: (params) => request.get('/products', { params }),

  // 获取产品详情
  getDetail: (id) => request.get(`/products/${id}`),

  // 创建产品（需要登录）
  create: (data) => request.post('/products', data),

  // 更新产品（需要登录）
  update: (id, data) => request.put(`/products/${id}`, data),

  // 删除产品（需要登录）
  remove: (id) => request.delete(`/products/${id}`),

  // 获取我的产品列表（需要登录）
  getMine: (params = {}) => request.get('/products/my', { params }),
}

// ===== 订单模块 =====
export const orders = {
  // 创建订单（需要登录）
  create: (data) => request.post('/orders', data),

  // 获取订单列表（需要登录）
  // params: { page, pageSize, status, role }
  getList: (params = {}) => request.get('/orders', { params }),

  // 获取订单详情（需要登录）
  getDetail: (id) => request.get(`/orders/${id}`),

  // 确认订单（卖家发货，需要登录）
  confirm: (id, data = {}) => request.put(`/orders/${id}/confirm`, data),

  // 取消订单（需要登录）
  cancel: (id, data = {}) => request.put(`/orders/${id}/cancel`, data),
}

// ===== 文件上传模块 =====
export const upload = {
  // 上传产品图片（需要登录）
  // 使用方式：const formData = new FormData(); formData.append('file', file); upload.image(formData)
  image: (formData) => request.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

export default {
  auth,
  products,
  orders,
  upload,
}

