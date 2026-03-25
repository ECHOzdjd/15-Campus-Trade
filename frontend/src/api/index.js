import request from '../utils/request.js'

// ===== 认证模块 =====
export const auth = {
  register: (data) => request.post('/auth/register', data),
  login: (data) => request.post('/auth/login', data),
  getMe: () => request.get('/auth/me'),
  updatePassword: (data) => request.put('/auth/password', data),
}

// ===== 商品模块 =====
export const products = {
  getList: (params) => request.get('/products', { params }),
  getDetail: (id) => request.get(`/products/${id}`),
  create: (data) => request.post('/products', data),
  update: (id, data) => request.put(`/products/${id}`, data),
  remove: (id) => request.delete(`/products/${id}`),
  getMine: () => request.get('/products/my'),
}

// ===== 订单模块 =====
export const orders = {
  create: (data) => request.post('/orders', data),
  getList: () => request.get('/orders'),
  getDetail: (id) => request.get(`/orders/${id}`),
  confirm: (id) => request.put(`/orders/${id}/confirm`),
  cancel: (id) => request.put(`/orders/${id}/cancel`),
}

// ===== 文件上传模块 =====
export const upload = {
  image: (formData) => request.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}
