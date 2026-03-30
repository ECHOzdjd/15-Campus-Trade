<template>
  <div class="test-container">
    <div class="test-header">
      <h1>🧪 API 测试页面</h1>
      <p>点击按钮测试 API，在浏览器控制台查看详细响应数据</p>
      
      <div class="test-credentials">
        <strong>📝 测试方式:</strong>
        <div>方式 1: 点击<code>注册用户</code>创建新账号，Token 自动保存</div>
        <div>方式 2: 使用初始账号登录 (user1@campustrade.com / Password123!)</div>
      </div>
    </div>

    <div class="test-buttons">
      <h2>🔐 认证相关</h2>
      <div style="margin-bottom: 10px;">
        <input v-model="authToken" type="text" placeholder="粘贴 Token (登录后从响应中复制)" style="width: 300px; padding: 8px;">
        <button @click="setToken" class="btn btn-primary">设置 Token</button>
        <button @click="clearToken" class="btn btn-secondary">清除 Token</button>
      </div>
      <button @click="testRegister" class="btn btn-primary">注册用户</button>
      <button @click="testLogin" class="btn btn-primary">用户登录</button>
      <button @click="testGetMe" class="btn btn-primary">获取当前用户</button>
      <button @click="testUpdatePassword" class="btn btn-primary">修改密码</button>
    </div>

    <div class="test-buttons">
      <h2>📦 产品相关</h2>
      <button @click="testGetProducts" class="btn btn-secondary">获取产品列表</button>
      <button @click="testGetProductDetail" class="btn btn-secondary">获取产品详情 (ID=1)</button>
      <button @click="testCreateProduct" class="btn btn-secondary">创建产品</button>
      <button @click="testGetMyProducts" class="btn btn-secondary">获取我的产品</button>
      <button @click="testUpdateProduct" class="btn btn-secondary">更新产品 (ID=1)</button>
      <button @click="testDeleteProduct" class="btn btn-secondary">删除产品 (ID=1)</button>
    </div>

    <div class="test-buttons">
      <h2>📋 订单相关</h2>
      <button @click="testGetOrders" class="btn btn-info">获取订单列表</button>
      <button @click="testGetOrderDetail" class="btn btn-info">获取订单详情 (ID=1)</button>
      <button @click="testCreateOrder" class="btn btn-info">创建订单</button>
      <button @click="testConfirmOrder" class="btn btn-info">确认订单 (ID=1)</button>
      <button @click="testCancelOrder" class="btn btn-info">取消订单 (ID=1)</button>
    </div>

    <div class="test-buttons">
      <h2>📤 文件上传</h2>
      <button @click="testUploadImage" class="btn btn-warning">上传图片（模拟）</button>
    </div>

    <div class="test-buttons">
      <button @click="clearConsole" class="btn btn-danger">清空响应</button>
    </div>

    <div class="response-box">
      <h2>📊 响应数据</h2>
      <div v-if="lastResponse" class="response-content">
        <div class="response-header">
          <span class="response-status" :class="getStatusClass(lastResponse.status)">
            {{ lastResponse.status }}
          </span>
          <span class="response-time">{{ lastResponse.time }}ms</span>
          <span class="response-api">{{ lastResponse.api }}</span>
        </div>
        <pre class="response-data">{{ lastResponse.data }}</pre>
      </div>
      <div v-else class="response-empty">
        点击上面的按钮开始测试...
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api'

const lastResponse = ref(null)
const authToken = ref(localStorage.getItem('token') || '')

// 设置 Token
const setToken = () => {
  if (authToken.value) {
    localStorage.setItem('token', authToken.value)
    console.log('✅ Token 已设置:', authToken.value.substring(0, 20) + '...')
  }
}

// 清除 Token
const clearToken = () => {
  localStorage.removeItem('token')
  authToken.value = ''
  console.log('✅ Token 已清除')
}

// 测试工具函数
const recordResponse = async (apiName, apiCall) => {
  const startTime = performance.now()
  try {
    const res = await apiCall()
    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)
    
    lastResponse.value = {
      api: apiName,
      status: '✅ 200',
      time: duration,
      data: JSON.stringify(res, null, 2)
    }
    
    console.log(`✅ ${apiName}`, res)
  } catch (error) {
    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)
    
    lastResponse.value = {
      api: apiName,
      status: `❌ ${error.response?.status || 'ERROR'}`,
      time: duration,
      data: JSON.stringify(error.response?.data || { message: error.message }, null, 2)
    }
    
    console.error(`❌ ${apiName}`, error.response?.data || error.message)
  }
}

// 认证测试
const testRegister = async () => {
  const startTime = performance.now()
  try {
    const res = await api.auth.register({
      studentId: '2312190' + Math.floor(Math.random() * 1000),
      email: 'test' + Date.now() + '@campustrade.com',
      username: 'Test User ' + Date.now(),
      password: 'TestPass123'
    })
    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)
    
    // 🔑 自动保存 Token
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token)
      authToken.value = res.data.token
      console.log('✅ Token 已自动保存:', res.data.token.substring(0, 30) + '...')
    }
    
    lastResponse.value = {
      api: 'POST /auth/register',
      status: '✅ 201',
      time: duration,
      data: JSON.stringify(res, null, 2)
    }
    
    console.log('✅ POST /auth/register (Token 已自动保存)', res)
  } catch (error) {
    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)
    
    lastResponse.value = {
      api: 'POST /auth/register',
      status: `❌ ${error.response?.status || 'ERROR'}`,
      time: duration,
      data: JSON.stringify(error.response?.data || { message: error.message }, null, 2)
    }
    
    console.error('❌ POST /auth/register', error.response?.data || error.message)
  }
}

const testLogin = async () => {
  const startTime = performance.now()
  try {
    const res = await api.auth.login({
      email: 'user1@campustrade.com',
      password: 'Password123!'
    })
    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)
    
    // 🔑 自动保存 Token
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token)
      authToken.value = res.data.token
      console.log('✅ Token 已自动保存:', res.data.token.substring(0, 30) + '...')
    }
    
    lastResponse.value = {
      api: 'POST /auth/login',
      status: '✅ 200',
      time: duration,
      data: JSON.stringify(res, null, 2)
    }
    
    console.log('✅ POST /auth/login (Token 已自动保存)', res)
  } catch (error) {
    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)
    
    lastResponse.value = {
      api: 'POST /auth/login',
      status: `❌ ${error.response?.status || 'ERROR'}`,
      time: duration,
      data: JSON.stringify(error.response?.data || { message: error.message }, null, 2)
    }
    
    console.error('❌ POST /auth/login', error.response?.data || error.message)
  }
}

const testGetMe = () => {
  recordResponse('GET /auth/me', () => api.auth.getMe())
}

const testUpdatePassword = () => {
  recordResponse('PUT /auth/password', () =>
    api.auth.updatePassword({
      oldPassword: 'Password123!',
      newPassword: 'NewPass123!'
    })
  )
}

// 产品测试
const testGetProducts = () => {
  recordResponse('GET /products (列表)', () =>
    api.products.getList({ page: 1, pageSize: 10 })
  )
}

const testGetProductDetail = () => {
  recordResponse('GET /products/1 (详情)', () =>
    api.products.getDetail(1)
  )
}

const testCreateProduct = () => {
  recordResponse('POST /products (创建)', () =>
    api.products.create({
      title: '测试商品 ' + Date.now(),
      description: '这是一个测试商品',
      category: 'books',
      price: 99.99,
      images: ['https://via.placeholder.com/300']
    })
  )
}

const testGetMyProducts = () => {
  recordResponse('GET /products/my (我的商品)', () =>
    api.products.getMine({ page: 1, pageSize: 10 })
  )
}

const testUpdateProduct = () => {
  recordResponse('PUT /products/1 (更新)', () =>
    api.products.update(1, {
      title: '更新的商品名称',
      price: 149.99,
      status: 'available'
    })
  )
}

const testDeleteProduct = () => {
  recordResponse('DELETE /products/1 (删除)', () =>
    api.products.remove(1)
  )
}

// 订单测试
const testGetOrders = () => {
  recordResponse('GET /orders (列表)', () =>
    api.orders.getList({ page: 1, pageSize: 10, role: 'all' })
  )
}

const testGetOrderDetail = () => {
  recordResponse('GET /orders/1 (详情)', () =>
    api.orders.getDetail(1)
  )
}

const testCreateOrder = () => {
  recordResponse('POST /orders (创建)', () =>
    api.orders.create({
      productId: 1,
      quantity: 1
    })
  )
}

const testConfirmOrder = () => {
  recordResponse('PUT /orders/1/confirm (确认)', () =>
    api.orders.confirm(1)
  )
}

const testCancelOrder = () => {
  recordResponse('PUT /orders/1/cancel (取消)', () =>
    api.orders.cancel(1)
  )
}

// 文件上传测试
const testUploadImage = () => {
  // 创建模拟文件用于演示
  const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
  const formData = new FormData()
  formData.append('image', mockFile)
  
  recordResponse('POST /upload/image', () =>
    api.upload.uploadImage(formData)
  )
}

// 清空响应
const clearConsole = () => {
  lastResponse.value = null
  console.clear()
}

// 根据状态获取 CSS 类
const getStatusClass = (status) => {
  if (status.includes('✅')) return 'success'
  if (status.includes('❌')) return 'error'
  return 'warning'
}
</script>

<style scoped>
.test-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 30px 20px;
  max-width: 1200px;
  margin: 0 auto;
  background: #f5f7fa;
  min-height: 100vh;
}

.test-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.test-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
}

.test-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.test-credentials {
  background: rgba(255, 255, 255, 0.2);
  border-left: 3px solid #ffd700;
  padding: 12px 15px;
  margin-top: 15px;
  border-radius: 4px;
  font-size: 13px;
}

.test-credentials strong {
  display: block;
  margin-bottom: 8px;
}

.test-credentials div {
  margin: 4px 0;
  font-family: 'Monaco', 'Courier New', monospace;
}

.test-credentials code {
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.test-buttons {
  background: white;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.test-buttons h2 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #333;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
}

.btn {
  display: inline-block;
  padding: 8px 16px;
  margin: 5px 5px 5px 0;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-secondary {
  background: #2ecc71;
  color: white;
}

.btn-secondary:hover {
  background: #27ae60;
}

.btn-info {
  background: #9b59b6;
  color: white;
}

.btn-info:hover {
  background: #8e44ad;
}

.btn-warning {
  background: #f39c12;
  color: white;
}

.btn-warning:hover {
  background: #e67e22;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

.response-box {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.response-box h2 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #333;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
}

.response-content {
  background: #f8f9fa;
  border-left: 4px solid #667eea;
  border-radius: 4px;
  overflow: hidden;
}

.response-header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 16px;
  background: #f0f0f0;
  border-bottom: 1px solid #e0e0e0;
  font-size: 12px;
}

.response-status {
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  min-width: 80px;
}

.response-status.success {
  background: #d4edda;
  color: #155724;
}

.response-status.error {
  background: #f8d7da;
  color: #721c24;
}

.response-status.warning {
  background: #fff3cd;
  color: #856404;
}

.response-time {
  color: #666;
}

.response-api {
  color: #667eea;
  font-weight: 500;
  flex: 1;
}

.response-data {
  padding: 16px;
  margin: 0;
  overflow-x: auto;
  max-height: 400px;
  font-size: 12px;
  line-height: 1.5;
  color: #333;
  background: #f8f9fa;
}

.response-empty {
  padding: 40px 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

@media (max-width: 768px) {
  .test-container {
    padding: 15px 10px;
  }

  .btn {
    padding: 6px 12px;
    font-size: 12px;
    margin: 4px 4px 4px 0;
  }

  .test-header h1 {
    font-size: 20px;
  }
}
</style>
