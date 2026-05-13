# API 设计与实现贡献说明 - 前端部分

**姓名：** 马俊晨  
**学号：** 2312190302  
**角色：** 前端开发  
**日期：** 2026-03-30

---

## 我完成的工作

### 1. 前端 API 访问层设计

- [x] **统一的 API 模块 (frontend/src/api/index.js)**
  - 按业务模块组织 API 调用函数
  - 模块划分：auth（认证）、products（产品）、orders（订单）、upload（上传）
  - 统一返回 Promise，便于 async/await 使用
  - 清晰的函数命名和参数说明

- [x] **认证相关 API**
  - `auth.register(data)` - 用户注册
  - `auth.login(data)` - 用户登录
  - `auth.getMe()` - 获取当前用户信息
  - `auth.updatePassword(data)` - 修改密码

- [x] **产品相关 API**
  - `products.getList(params)` - 获取产品列表（支持分页、搜索、筛选）
  - `products.getDetail(id)` - 获取产品详情
  - `products.create(data)` - 创建产品
  - `products.update(id, data)` - 更新产品
  - `products.remove(id)` - 删除产品
  - `products.getMine(params)` - 获取个人产品列表

- [x] **订单相关 API**
  - `orders.create(data)` - 创建订单
  - `orders.getList(params)` - 获取订单列表
  - `orders.getDetail(id)` - 获取订单详情
  - `orders.confirm(id, data)` - 确认订单
  - `orders.cancel(id, data)` - 取消订单

- [x] **文件上传 API**
  - `upload.image(formData)` - 上传产品图片
  - 自动处理 multipart/form-data 内容类型

### 2. HTTP 客户端配置 (frontend/src/utils/request.js)

- [x] **Axios 实例封装**
  - 配置 Base URL（支持环境变量）
  - 设置请求超时：10 秒
  - 统一的实例管理

- [x] **请求拦截器**
  - 自动从 localStorage 读取 Token
  - 将 Token 附加到 Authorization 请求头
  - 格式：`Bearer <JWT_TOKEN>`

- [x] **响应拦截器**
  - 自动提取 `response.data`，简化客户端使用
  - 处理 401 未授权错误：
    - 清除本地 Token
    - 跳转到登录页面
  - 统一的错误处理

- [x] **环保的错误处理**
  - 返回响应数据或错误信息
  - 统一的错误格式：`err.response.data`

### 3. 前端调用示例与使用文档

- [x] **API 使用说明文档 (docs/api.md)**
  - JavaScript (Axios) 示例代码
  - Python (requests) 示例代码
  - 覆盖主要业务场景

- [x] **示例代码**
  - 登录流程：`login(email, password)`
  - 产品列表查询：`getProducts(page, category)`
  - 产品创建：`createProduct(product)`
  - 图片上传：`uploadImage(file)`
  - 订单创建：`createOrder(productId, address)`

### 4. 环境配置

- [x] **环境变量支持 (.env.example)**
  - `VITE_API_BASE_URL` - API 基地址
  - 支持开发/测试/生产环境切换

- [x] **开发环境配置**
  - 默认连接到 `http://localhost:3000/api`
  - 可通过 `.env` 文件覆盖

### 5. 测试

- [x] **Postman 测试集合支持**
  - 前端调用流程验证
  - API 响应格式验证
  - 错误场景测试

---

## 技术栈

- **前端框架：** Vue 3
- **HTTP 客户端：** Axios 1.x
- **路由：** Vue Router 4
- **状态管理：** Pinia 2
- **UI 组件库：** Element Plus 2
- **构建工具：** Vite 5

---

## 设计要点

### 1. 模块化 API 封装

将所有 API 调用按业务模块命名空间组织，便于管理和维护：

```javascript
// 使用方式
import { auth, products, orders, upload } from '@/api'

await auth.login({ email, password })
await products.getList({ page: 1, category: 'electronics' })
await orders.create({ productId: 1, shippingAddress: '...' })
```

### 2. 自动化 Token 管理

通过请求拦截器自动处理 JWT Token：
- 登录后由后端返回 Token
- 前端自动保存到 localStorage
- 后续所有请求自动附加 Token
- Token 失效时自动清除并重定向

### 3. 统一的错误处理

所有 API 调用统一返回后端的响应数据，便于前端统一处理：
- 成功：`response.code === 200 || 201`
- 失败：`response.code !== 200`
- 401 特殊处理：跳转登录

### 4. 灵活的参数传递

支持多种参数传递方式：
- 查询参数：`{ params: { page, pageSize, ... } }`
- 请求体：直接传递 data 对象
- 路径参数：通过模板字符串

### 5. 便利的文件上传

简化文件上传流程：

```javascript
const formData = new FormData()
formData.append('file', file)
const result = await upload.image(formData)
// result.data.url 即为上传后的图片地址
```

---

## 前端集成指南

### 登录流程

```javascript
import { auth } from '@/api'

async function handleLogin(email, password) {
  try {
    const res = await auth.login({ email, password })
    if (res.code === 200) {
      // 保存 Token（request.js 中的拦截器会自动处理）
      localStorage.setItem('token', res.data.token)
      // 保存用户信息到 Pinia store
      userStore.setUser(res.data.user)
      // 导航到首页
      router.push('/home')
    }
  } catch (error) {
    // 显示错误提示
    ElMessage.error(error.message || '登录失败')
  }
}
```

### 获取产品列表

```javascript
import { products } from '@/api'

async function loadProducts(filters) {
  try {
    const res = await products.getList({
      page: filters.page || 1,
      pageSize: filters.pageSize || 10,
      category: filters.category,
      search: filters.search,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      sortBy: filters.sortBy || 'createdAt',
      sortOrder: filters.sortOrder || 'desc'
    })
    if (res.code === 200) {
      productStore.setProducts(res.data.items)
      productStore.setTotal(res.data.total)
    }
  } catch (error) {
    ElMessage.error('加载产品失败')
  }
}
```

### 创建产品

```javascript
import { products, upload } from '@/api'

async function handleCreateProduct(form) {
  try {
    // 1. 上传图片
    const imagePromises = form.images.map(file => {
      const formData = new FormData()
      formData.append('file', file)
      return upload.image(formData)
    })
    const imageResults = await Promise.all(imagePromises)
    const imageUrls = imageResults.map(res => res.data.url)

    // 2. 创建产品
    const res = await products.create({
      title: form.title,
      description: form.description,
      price: form.price,
      category: form.category,
      images: imageUrls
    })

    if (res.code === 201) {
      ElMessage.success('产品创建成功')
      router.push('/my-products')
    }
  } catch (error) {
    ElMessage.error('创建产品失败')
  }
}
```

### 创建订单

```javascript
import { orders } from '@/api'

async function handleCreateOrder(productId, shippingAddress) {
  try {
    const res = await orders.create({
      productId,
      shippingAddress
    })
    if (res.code === 201) {
      ElMessage.success('订单已创建')
      router.push(`/orders/${res.data.id}`)
    }
  } catch (error) {
    ElMessage.error(error.message || '创建订单失败')
  }
}
```

---

## 遇到的问题和解决

1. **问题：** 上传多张图片时如何处理？
   - **解决：** 使用 `Promise.all()` 并行上传，等待所有上传完成后再提交产品信息

2. **问题：** 如何避免多次登录提示？
   - **解决：** 在响应拦截器中判断是否已经跳转，只在第一次 401 时跳转

3. **问题：** 如何在前端区分不同的查询参数？
   - **解决：** 使用 `params` 对象包装查询参数，让 Axios 自动处理 URL 编码

4. **问题：** 文件上传时如何显示进度？
   - **解决：** 可以在 Axios 实例中配置 `onUploadProgress` 回调

5. **问题：** 如何处理网络超时？
   - **解决：** 设置 Axios 超时为 10 秒，超时时自动提示重试

---

## 最佳实践

1. **统一的错误处理**
   - 所有 API 调用都使用 try/catch
   - 在 UI 层显示用户友好的错误提示
   - 在开发工具中记录详细的错误信息

2. **请求状态管理**
   - 使用 Pinia store 管理 API 请求状态
   - 在组件中使用 computed 获取最新数据
   - 避免重复请求相同的数据

3. **Token 失效处理**
   - 自动清除失效 Token
   - 跳转到登录页面重新认证
   - 重新登录后继续之前的操作

4. **性能优化**
   - 使用防抖（debounce）减少搜索请求
   - 使用节流（throttle）限制滚动加载频率
   - 缓存产品列表数据减少重复请求

---

## 心得体会

1. **API 设计与前端的关系**：清晰的 API 设计能大幅简化前端的实现。通过统一的响应格式和明确的错误定义，前端可以更容易地处理各种场景。

2. **模块化的重要性**：将 API 按业务模块组织，不仅便于维护，也使得代码更容易被其他开发者理解。

3. **拦截器的强大**：请求/响应拦截器是 Axios 最强大的特性之一，通过它实现 Token 自动附加和 401 处理，减少了大量的重复代码。

4. **测试的必要性**：通过 Postman 依次测试 API，及时发现问题。前端在集成时也应该测试不同的场景（成功、失败、网络错误等）。

5. **文档的价值**：详细的 API 文档让前后端协作变得高效。有了清晰的 API 定义，前端可以在后端实现完成前就进行 Mock 测试。

---

## 相关文件

- [API 调用层](../../frontend/src/api/index.js)
- [HTTP 客户端配置](../../frontend/src/utils/request.js)
- [API 使用说明](../api.md)
- [OpenAPI 规范](../api.yaml)
- [Postman 测试集合](../Postman_Collection.json)
