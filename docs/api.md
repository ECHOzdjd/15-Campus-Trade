# API 使用说明

> **文档版本：** v1.0.0  
> **最后更新：** 2026-03-30  
> **对应 OpenAPI 规范：** [docs/api.yaml](./api.yaml)

---

## 目录

1. [接口规范](#接口规范)
2. [认证相关](#认证相关)
3. [产品管理](#产品管理)
4. [订单管理](#订单管理)
5. [文件上传](#文件上传)
6. [常见问题](#常见问题)
7. [示例代码](#示例代码)

---

## 接口规范

### Base URL
```
http://localhost:3000/api
```

### 请求规范

- **请求头：** `Content-Type: application/json`（除文件上传外）
- **身份验证：** JWT Token，放在 `Authorization` 请求头中
  ```
  Authorization: Bearer <JWT_TOKEN>
  ```
- **字符编码：** UTF-8

### 统一响应格式

所有接口都遵循统一的 JSON 响应格式：

**成功响应（HTTP 200/201）：**
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

**失败响应（HTTP 4xx/5xx）：**
```json
{
  "code": 400,
  "message": "错误描述，如：参数验证失败",
  "data": null
}
```

### HTTP 状态码

| 状态码 | 场景 | 说明 |
|--------|------|------|
| 200 | GET、PUT | 请求成功 |
| 201 | POST | 资源创建成功 |
| 400 | - | 请求参数错误或业务规则校验失败 |
| 401 | - | 未授权（未登录、Token 失效或格式错误） |
| 403 | - | 禁止访问（权限不足，如无权删除他人产品） |
| 404 | - | 资源不存在 |
| 409 | - | 冲突（如产品已被购买） |
| 500 | - | 服务器内部错误 |

---

## 认证相关

所有涉及用户操作的接口都需要身份验证。Token 在登录后由服务器返回，前端需要将其保存在 `localStorage` 中并在每个请求中附带。

### 用户注册

**POST** `/auth/register`

**请求体：**
```json
{
  "studentId": "2312190301",
  "email": "user@campustrade.com",
  "password": "Password123!",
  "username": "张三"
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 约束 |
|------|------|------|------|
| studentId | string | ✅ | 学号，唯一 |
| email | string | ✅ | 邮箱，唯一，格式需合法 |
| password | string | ✅ | 至少 8 位，需包含大小写字母和数字 |
| username | string | ✅ | 用户名，2-20 字符 |

**成功响应（201）：**
```json
{
  "code": 201,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "studentId": "2312190301",
      "email": "user@campustrade.com",
      "username": "张三",
      "avatar": null,
      "phone": null,
      "createdAt": "2026-03-30T10:00:00Z"
    }
  }
}
```

**失败场景：**
- 学号或邮箱已存在 → 400
- 密码强度不足 → 400
- 邮箱格式错误 → 400

---

### 用户登录

**POST** `/auth/login`

**请求体：**
```json
{
  "email": "user@campustrade.com",
  "password": "Password123!"
}
```

**参数说明：**
| 参数 | 类型 | 必填 |
|------|------|------|
| email | string | ✅ |
| password | string | ✅ |

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "studentId": "2312190301",
      "email": "user@campustrade.com",
      "username": "张三",
      "avatar": "http://localhost:3000/uploads/avatar_1.jpg",
      "phone": "13800138000",
      "createdAt": "2026-03-30T10:00:00Z"
    }
  }
}
```

**失败场景：**
- 用户不存在或密码错误 → 401
- 输入参数缺失 → 400

---

### 获取当前用户信息

**GET** `/auth/me`

**需要身份验证：** ✅

**请求头示例：**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "studentId": "2312190301",
    "email": "user@campustrade.com",
    "username": "张三",
    "avatar": "http://localhost:3000/uploads/avatar_1.jpg",
    "phone": "13800138000",
    "createdAt": "2026-03-30T10:00:00Z"
  }
}
```

**失败场景：**
- Token 缺失或无效 → 401

---

### 修改密码

**PUT** `/auth/password`

**需要身份验证：** ✅

**请求体：**
```json
{
  "oldPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| oldPassword | string | ✅ | 旧密码 |
| newPassword | string | ✅ | 新密码（至少 8 位，需包含大小写字母和数字） |

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

**失败场景：**
- 旧密码错误 → 401
- 新密码强度不足 → 400

---

## 产品管理

### 获取产品列表

**GET** `/products`

**查询参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | integer | 1 | 页码 |
| pageSize | integer | 10 | 每页记录数 |
| search | string | - | 搜索关键词（标题和描述） |
| category | string | - | 分类过滤：electronics/books/furniture/clothing/other |
| minPrice | number | - | 最低价格 |
| maxPrice | number | - | 最高价格 |
| status | string | - | 状态过滤：selling/sold/removed |
| sortBy | string | createdAt | 排序字段：createdAt/price |
| sortOrder | string | desc | 排序顺序：asc/desc |

**请求示例：**
```
GET /products?page=1&pageSize=10&category=electronics&sortBy=price&sortOrder=asc
```

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 50,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5,
    "items": [
      {
        "id": 1,
        "title": "全新苹果 MacBook Pro",
        "description": "14寸屏幕，M2 芯片，1TB 存储...",
        "price": 5999.99,
        "category": "electronics",
        "images": ["http://localhost:3000/uploads/product_1.jpg"],
        "status": "selling",
        "sellerId": 2,
        "seller": {
          "id": 2,
          "username": "李四",
          "avatar": "http://localhost:3000/uploads/avatar_2.jpg"
        },
        "createdAt": "2026-03-30T10:00:00Z",
        "updatedAt": "2026-03-30T10:00:00Z"
      }
    ]
  }
}
```

---

### 获取产品详情

**GET** `/products/{id}`

**路径参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| id | integer | 产品 ID |

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "title": "全新苹果 MacBook Pro",
    "description": "14寸屏幕，M2 芯片，1TB 存储，几乎全新，无磕碰...",
    "price": 5999.99,
    "category": "electronics",
    "images": [
      "http://localhost:3000/uploads/product_1.jpg",
      "http://localhost:3000/uploads/product_2.jpg"
    ],
    "status": "selling",
    "sellerId": 2,
    "seller": {
      "id": 2,
      "username": "李四",
      "avatar": "http://localhost:3000/uploads/avatar_2.jpg",
      "phone": "13900139000"
    },
    "createdAt": "2026-03-30T10:00:00Z",
    "updatedAt": "2026-03-30T10:00:00Z"
  }
}
```

**失败场景：**
- 产品不存在 → 404

---

### 创建产品

**POST** `/products`

**需要身份验证：** ✅

**请求体：**
```json
{
  "title": "全新苹果 MacBook Pro",
  "description": "14寸屏幕，M2 芯片，1TB 存储，几乎全新",
  "price": 5999.99,
  "category": "electronics",
  "images": [
    "http://localhost:3000/uploads/product_1.jpg",
    "http://localhost:3000/uploads/product_2.jpg"
  ]
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 产品标题，1-100 字符 |
| description | string | ✅ | 产品描述，1-1000 字符 |
| price | number | ✅ | 价格，≥ 0.01 |
| category | string | ✅ | 分类 |
| images | array | ✅ | 图片 URL 列表，至少 1 张 |

**成功响应（201）：**
```json
{
  "code": 201,
  "message": "success",
  "data": {
    "id": 101,
    "title": "全新苹果 MacBook Pro",
    "description": "14寸屏幕，M2 芯片，1TB 存储，几乎全新",
    "price": 5999.99,
    "category": "electronics",
    "images": [
      "http://localhost:3000/uploads/product_1.jpg",
      "http://localhost:3000/uploads/product_2.jpg"
    ],
    "status": "selling",
    "sellerId": 1,
    "seller": {
      "id": 1,
      "username": "张三",
      "avatar": "http://localhost:3000/uploads/avatar_1.jpg"
    },
    "createdAt": "2026-03-30T15:00:00Z",
    "updatedAt": "2026-03-30T15:00:00Z"
  }
}
```

**失败场景：**
- 参数缺失或格式错误 → 400
- 未登录 → 401

---

### 更新产品

**PUT** `/products/{id}`

**需要身份验证：** ✅

**路径参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| id | integer | 产品 ID |

**请求体：** 同创建产品

**成功响应（200）：** 同创建产品

**失败场景：**
- 产品不存在 → 404
- 无权限修改（非卖家） → 403
- 参数格式错误 → 400

---

### 删除产品

**DELETE** `/products/{id}`

**需要身份验证：** ✅

**路径参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| id | integer | 产品 ID |

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

**失败场景：**
- 产品不存在 → 404
- 无权限删除（非卖家） → 403

---

### 获取我的产品列表

**GET** `/products/my`

**需要身份验证：** ✅

**查询参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | integer | 1 | 页码 |
| pageSize | integer | 10 | 每页记录数 |

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 5,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1,
    "items": [ ... ]
  }
}
```

---

## 订单管理

### 创建订单

**POST** `/orders`

**需要身份验证：** ✅

**请求体：**
```json
{
  "productId": 1,
  "shippingAddress": "石家庄市长安区123号宿舍"
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | integer | ✅ | 产品 ID |
| shippingAddress | string | ✅ | 配送地址，1-200 字符 |

**成功响应（201）：**
```json
{
  "code": 201,
  "message": "success",
  "data": {
    "id": 1,
    "orderNumber": "ORD20260330001",
    "productId": 1,
    "product": { ... },
    "buyerId": 1,
    "sellerId": 2,
    "seller": { ... },
    "price": 5999.99,
    "status": "pending",
    "shippingAddress": "石家庄市长安区123号宿舍",
    "createdAt": "2026-03-30T15:00:00Z",
    "updatedAt": "2026-03-30T15:00:00Z"
  }
}
```

**失败场景：**
- 产品不存在或不可购买 → 404/409
- 参数格式错误 → 400

---

### 获取订单列表

**GET** `/orders`

**需要身份验证：** ✅

**查询参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | integer | 1 | 页码 |
| pageSize | integer | 10 | 每页记录数 |
| status | string | - | 状态过滤：pending/shipped/delivered/completed/cancelled |
| role | string | all | 角色过滤：buyer/seller/all |

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 3,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1,
    "items": [ ... ]
  }
}
```

---

### 获取订单详情

**GET** `/orders/{id}`

**需要身份验证：** ✅

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "orderNumber": "ORD20260330001",
    "productId": 1,
    "product": { ... },
    "buyerId": 1,
    "sellerId": 2,
    "seller": { ... },
    "price": 5999.99,
    "status": "pending",
    "shippingAddress": "石家庄市长安区123号宿舍",
    "createdAt": "2026-03-30T15:00:00Z",
    "updatedAt": "2026-03-30T15:00:00Z"
  }
}
```

---

### 确认订单（卖家发货）

**PUT** `/orders/{id}/confirm`

**需要身份验证：** ✅

**请求体：**
```json
{
  "trackingNumber": "SF123456789012"
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| trackingNumber | string | 否 | 快递单号 |

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "status": "shipped",
    ...
  }
}
```

**失败场景：**
- 无权限（非卖家） → 403
- 订单状态不允许确认 → 400

---

### 取消订单

**PUT** `/orders/{id}/cancel`

**需要身份验证：** ✅

**请求体：**
```json
{
  "reason": "不需要了"
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| reason | string | 否 | 取消原因 |

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "status": "cancelled",
    ...
  }
}
```

---

## 文件上传

### 上传产品图片

**POST** `/upload/image`

**需要身份验证：** ✅

**请求体：** Form-Data

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | ✅ | 图片文件，支持 jpg/jpeg/png/gif，单文件 ≤ 5MB |

**使用 curl 示例：**
```bash
curl -X POST \
  http://localhost:3000/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

**成功响应（201）：**
```json
{
  "code": 201,
  "message": "success",
  "data": {
    "url": "http://localhost:3000/uploads/product_1709288400000.jpg",
    "filename": "product_1709288400000.jpg"
  }
}
```

**失败场景：**
- 文件格式不支持 → 400
- 文件过大 → 400
- 未登录 → 401

---

## 常见问题

### Q1: 如何处理 Token 过期？

A: 建议在前端请求拦截器中：
1. 捕获 401 响应
2. 清除本地 Token
3. 跳转到登录页面
4. 用户需要重新登录

### Q2: 为什么上传图片返回 URL 而不是 base64？

A: 返回 URL 相比 base64 有以下优势：
- 减少响应体大小
- 支持浏览器直接缓存
- 便于后续 CDN 集成

### Q3: 产品列表如何排序？

A: 使用查询参数 `sortBy` 和 `sortOrder`：
```
GET /products?sortBy=price&sortOrder=asc  # 价格低→高
GET /products?sortBy=createdAt&sortOrder=desc  # 最新发布
```

### Q4: 订单状态流转全过程是怎样的？

A: 正常流程：
- `pending` (待确认) → `shipped` (已发货) → `delivered` (已送达) → `completed` (已完成)

异常流程：
- 任何状态都可以转为 `cancelled` (已取消)

---

## 示例代码

### JavaScript (使用 Axios)

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

// 请求拦截器：自动附加 Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：处理 401
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

// 用例：登录
async function login(email, password) {
  const res = await api.post('/auth/login', { email, password })
  localStorage.setItem('token', res.data.token)
  return res.data
}

// 用例：获取产品列表
async function getProducts(page = 1, category = null) {
  const res = await api.get('/products', {
    params: { page, pageSize: 10, category }
  })
  return res.data.items
}

// 用例：创建产品
async function createProduct(product) {
  const res = await api.post('/products', product)
  return res.data
}

// 用例：上传图片
async function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data.url
}
```

### Python (使用 requests)

```python
import requests
import json

BASE_URL = 'http://localhost:3000/api'
token = None

def login(email, password):
    global token
    response = requests.post(f'{BASE_URL}/auth/login', json={
        'email': email,
        'password': password
    })
    data = response.json()
    token = data['data']['token']
    return data

def get_products(page=1, category=None):
    headers = {'Authorization': f'Bearer {token}'} if token else {}
    response = requests.get(f'{BASE_URL}/products', params={
        'page': page,
        'pageSize': 10,
        'category': category
    }, headers=headers)
    return response.json()['data']['items']

def create_product(title, description, price, category, images):
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.post(f'{BASE_URL}/products', json={
        'title': title,
        'description': description,
        'price': price,
        'category': category,
        'images': images
    }, headers=headers)
    return response.json()

def create_order(product_id, shipping_address):
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.post(f'{BASE_URL}/orders', json={
        'productId': product_id,
        'shippingAddress': shipping_address
    }, headers=headers)
    return response.json()
```

---

## 相关文档

- [**OpenAPI 规范**](./api.yaml) - 完整 API 定义
- [**前端架构**](./frontend.md)
- [**后端架构**](./backend.md)
- [**数据库设计**](./database.md)
```json
{
  "email": "student01@example.com",
  "password": "Password123"
}
```

**成功响应：**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "id": 1,
    "username": "student01",
    "email": "student01@example.com",
    "avatar": "http://localhost:3000/uploads/avatar/default.png",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2.3 获取当前用户信息

**GET** `/api/auth/me`  
🔒 **需要鉴权**

**成功响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "username": "student01",
    "email": "student01@example.com",
    "avatar": "http://localhost:3000/uploads/avatar/default.png",
    "created_at": "2026-03-09T08:00:00.000Z"
  }
}
```

---

### 2.4 修改密码

**PUT** `/api/auth/password`  
🔒 **需要鉴权**

**请求体：**
```json
{
  "old_password": "Password123",
  "new_password": "NewPassword456"
}
```

**成功响应：**
```json
{
  "code": 200,
  "message": "密码修改成功",
  "data": null
}
```

---

## 三、商品模块 `/api/products`

### 3.1 获取商品列表

**GET** `/api/products`

**Query 参数：**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | ❌ | 1 | 页码 |
| limit | number | ❌ | 10 | 每页数量（最大 50） |
| category | string | ❌ | - | 分类：`book` / `electronics` / `clothing` / `daily` / `other` |
| keyword | string | ❌ | - | 关键词搜索（标题/描述） |
| sort | string | ❌ | `created_at` | 排序字段：`price` / `created_at` |
| order | string | ❌ | `desc` | 排序方向：`asc` / `desc` |

**请求示例：**
```
GET /api/products?page=1&limit=10&category=book&keyword=高数
```

**成功响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "list": [
      {
        "id": 1,
        "title": "高等数学（第七版）上册",
        "price": 15.00,
        "category": "book",
        "images": ["http://localhost:3000/uploads/products/1_1.jpg"],
        "status": "on_sale",
        "seller": {
          "id": 2,
          "username": "seller01"
        },
        "created_at": "2026-03-09T08:00:00.000Z"
      }
    ]
  }
}
```

---

### 3.2 获取商品详情

**GET** `/api/products/:id`

**路径参数：**
| 参数 | 说明 |
|------|------|
| id | 商品 ID |

**成功响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "title": "高等数学（第七版）上册",
    "description": "九成新，无笔记，买来没用到",
    "price": 15.00,
    "category": "book",
    "images": [
      "http://localhost:3000/uploads/products/1_1.jpg",
      "http://localhost:3000/uploads/products/1_2.jpg"
    ],
    "status": "on_sale",
    "seller": {
      "id": 2,
      "username": "seller01",
      "avatar": "http://localhost:3000/uploads/avatar/2.jpg"
    },
    "created_at": "2026-03-09T08:00:00.000Z"
  }
}
```

---

### 3.3 发布商品

**POST** `/api/products`  
🔒 **需要鉴权**

**请求体：**
```json
{
  "title": "高等数学（第七版）上册",
  "description": "九成新，无笔记，买来没用到",
  "price": 15.00,
  "category": "book",
  "images": ["http://localhost:3000/uploads/products/1_1.jpg"]
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 商品标题，5-100 个字符 |
| description | string | ✅ | 商品描述，最多 500 字 |
| price | number | ✅ | 价格，最小 0.01 |
| category | string | ✅ | 分类 |
| images | array | ✅ | 图片 URL 数组，1-9 张 |

**成功响应：**
```json
{
  "code": 201,
  "message": "商品发布成功",
  "data": {
    "id": 10
  }
}
```

---

### 3.4 修改商品信息

**PUT** `/api/products/:id`  
🔒 **需要鉴权**（仅卖家本人可操作）

**请求体：**（同发布商品，字段均为可选）
```json
{
  "price": 12.00,
  "description": "再降价，急出"
}
```

**成功响应：**
```json
{
  "code": 200,
  "message": "修改成功",
  "data": null
}
```

---

### 3.5 下架商品

**DELETE** `/api/products/:id`  
🔒 **需要鉴权**（仅卖家本人可操作）

**成功响应：**
```json
{
  "code": 200,
  "message": "商品已下架",
  "data": null
}
```

---

### 3.6 获取我发布的商品

**GET** `/api/products/my`  
🔒 **需要鉴权**

**Query 参数：**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | ❌ | 1 | 页码 |
| limit | number | ❌ | 10 | 每页数量 |
| status | string | ❌ | - | 状态筛选 |

**成功响应：** 同商品列表格式

---

## 四、订单模块 `/api/orders`

### 4.1 创建订单

**POST** `/api/orders`  
🔒 **需要鉴权**

**请求体：**
```json
{
  "product_id": 1
}
```

**成功响应：**
```json
{
  "code": 201,
  "message": "订单创建成功",
  "data": {
    "id": 5,
    "product_id": 1,
    "price": 15.00,
    "status": "pending",
    "created_at": "2026-03-09T10:00:00.000Z"
  }
}
```

---

### 4.2 获取订单列表

**GET** `/api/orders`  
🔒 **需要鉴权**

**Query 参数：**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| role | string | ❌ | `buyer` | 角色：`buyer`（买家）/ `seller`（卖家） |
| status | string | ❌ | - | 状态筛选 |
| page | number | ❌ | 1 | 页码 |
| limit | number | ❌ | 10 | 每页数量 |

**成功响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "list": [
      {
        "id": 5,
        "product": {
          "id": 1,
          "title": "高等数学（第七版）上册",
          "images": ["http://localhost:3000/uploads/products/1_1.jpg"]
        },
        "price": 15.00,
        "status": "pending",
        "created_at": "2026-03-09T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 4.3 获取订单详情

**GET** `/api/orders/:id`  
🔒 **需要鉴权**

**成功响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 5,
    "product": {
      "id": 1,
      "title": "高等数学（第七版）上册",
      "price": 15.00,
      "images": ["http://localhost:3000/uploads/products/1_1.jpg"]
    },
    "buyer": {
      "id": 3,
      "username": "buyer01"
    },
    "seller": {
      "id": 2,
      "username": "seller01"
    },
    "price": 15.00,
    "status": "pending",
    "created_at": "2026-03-09T10:00:00.000Z"
  }
}
```

---

### 4.4 确认订单

**PUT** `/api/orders/:id/confirm`  
🔒 **需要鉴权**（仅卖家可操作）

**成功响应：**
```json
{
  "code": 200,
  "message": "订单已确认",
  "data": null
}
```

---

### 4.5 取消订单

**PUT** `/api/orders/:id/cancel`  
🔒 **需要鉴权**（买家或卖家均可取消，待确认状态下）

**成功响应：**
```json
{
  "code": 200,
  "message": "订单已取消",
  "data": null
}
```

---

## 五、文件上传模块 `/api/upload`

### 5.1 上传商品图片

**POST** `/api/upload/image`  
🔒 **需要鉴权**

**请求格式：** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | ✅ | 图片文件，支持 jpg/png/webp，最大 5MB |

**成功响应：**
```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "http://localhost:3000/uploads/products/abc123.jpg"
  }
}
```

---

## 六、健康检查

### 6.1 服务健康检查

**GET** `/api/health`

**成功响应：**
```json
{
  "status": "ok",
  "time": "2026-03-09T08:00:00.000Z"
}
```

---

## 七、错误码汇总

| 错误码 | 含义 |
|--------|------|
| 400001 | 参数校验失败 |
| 401001 | Token 不存在 |
| 401002 | Token 已过期 |
| 401003 | 用户名或密码错误 |
| 403001 | 无权操作该资源 |
| 404001 | 用户不存在 |
| 404002 | 商品不存在 |
| 404003 | 订单不存在 |
| 409001 | 邮箱已被注册 |
| 409002 | 用户名已被使用 |
| 422001 | 商品已售出，无法下单 |
| 422002 | 不能购买自己的商品 |
