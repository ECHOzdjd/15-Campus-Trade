# API 设计文档

> **负责人：** 王勇（ywang）  
> **学号：** 2312190301  
> **版本：** v1.0.0  
> **更新时间：** 2026-03-09

---

## 一、接口规范

### Base URL
```
http://localhost:3000/api
```

### 请求规范
- 请求体格式：`Content-Type: application/json`
- 文件上传：`Content-Type: multipart/form-data`
- 需要鉴权的接口在 Header 中携带：
  ```
  Authorization: Bearer <JWT_TOKEN>
  ```

### 统一响应格式

**成功响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

**失败响应：**
```json
{
  "code": 400,
  "message": "错误描述",
  "data": null
}
```

### 状态码说明
| 状态码 | 含义 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（未登录或 Token 失效） |
| 403 | 禁止访问（权限不足） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 二、认证模块 `/api/auth`

### 2.1 用户注册

**POST** `/api/auth/register`

**请求体：**
```json
{
  "username": "student01",
  "email": "student01@example.com",
  "password": "Password123"
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | ✅ | 用户名，3-20 个字符 |
| email | string | ✅ | 邮箱地址 |
| password | string | ✅ | 密码，至少 8 位，含字母和数字 |

**成功响应：**
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "id": 1,
    "username": "student01",
    "email": "student01@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2.2 用户登录

**POST** `/api/auth/login`

**请求体：**
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
