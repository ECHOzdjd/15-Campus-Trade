import request from '../utils/request.js'

export const auth = {
  register: (data) => request.post('/auth/register', data),
  login: (data) => request.post('/auth/login', data),
  getMe: () => request.get('/auth/me'),
  updatePassword: (data) => request.put('/auth/password', data),
}

export const products = {
  getList: (params) => request.get('/products', { params }),
  getDetail: (id) => request.get(`/products/${id}`),
  create: (data) => request.post('/products', data),
  update: (id, data) => request.put(`/products/${id}`, data),
  remove: (id) => request.delete(`/products/${id}`),
  getMine: (params = {}) => request.get('/products/my', { params }),
}

export const orders = {
  create: (data) => request.post('/orders', data),
  getList: (params = {}) => request.get('/orders', { params }),
  getDetail: (id) => request.get(`/orders/${id}`),
  pay: (id) => request.post(`/orders/${id}/pay`),
  confirmReceived: (id) => request.post(`/orders/${id}/confirm-received`),
  confirmHandoff: (id) => request.post(`/orders/${id}/confirm-handoff`),
  requestRelease: (id, data) => request.post(`/orders/${id}/request-release`, data),
  createDispute: (id, data) => request.post(`/orders/${id}/disputes`, data),
  confirm: (id, data = {}) => request.put(`/orders/${id}/confirm`, data),
  cancel: (id, data = {}) => request.put(`/orders/${id}/cancel`, data),
}

export const wallet = {
  get: () => request.get('/wallet'),
  recharge: (data) => request.post('/wallet/recharge', data),
}

export const disputes = {
  respond: (id, data) => request.post(`/disputes/${id}/respond`, data),
  resolve: (id, data) => request.post(`/disputes/${id}/resolve`, data),
}

export const admin = {
  getProducts: (params = {}) => request.get('/admin/products', { params }),
  removeProduct: (id) => request.delete(`/admin/products/${id}`),
  getDisputes: (params = {}) => request.get('/admin/disputes', { params }),
}

export const conversations = {
  create: (data) => request.post('/conversations', data),
  getList: () => request.get('/conversations'),
  getDetail: (id) => request.get(`/conversations/${id}`),
  sendMessage: (id, data) => request.post(`/conversations/${id}/messages`, data),
  markRead: (id) => request.put(`/conversations/${id}/read`),
  streamUrl: (id, token) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
    return `${baseURL}/conversations/${id}/stream?token=${encodeURIComponent(token)}`
  },
}

export const favorites = {
  getList: () => request.get('/favorites'),
  check: (productId) => request.get(`/favorites/${productId}`),
  add: (productId) => request.post(`/favorites/${productId}`),
  remove: (productId) => request.delete(`/favorites/${productId}`),
}

export const upload = {
  image: (formData) => request.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

export const ai = {
  productDraft: (data) => request.post('/ai/product-draft', data),
  priceSuggestion: (data) => request.post('/ai/price-suggestion', data),
  riskCheck: (data) => request.post('/ai/risk-check', data),
}

export default {
  auth,
  products,
  orders,
  wallet,
  disputes,
  admin,
  conversations,
  favorites,
  upload,
  ai,
}
