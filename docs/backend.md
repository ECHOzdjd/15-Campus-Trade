# 后端模块说明文档

> **负责人：** 王勇（ywang）  
> **学号：** 2312190301  
> **更新时间：** 2026-03-09

---

## 一、模块功能概述

后端负责为校园二手交易平台提供稳定、安全的数据接口服务，主要承担以下职责：

| 功能模块 | 说明 |
|----------|------|
| 用户认证 | 注册、登录、JWT 鉴权、密码加密 |
| 商品管理 | 商品发布、编辑、下架、分页查询、分类筛选 |
| 订单管理 | 创建订单、查看订单状态、取消订单 |
| 文件上传 | 商品图片上传（本地存储 / 阿里云 OSS） |
| 消息通知 | 交易状态变更通知（邮件 / 站内信） |
| 搜索服务 | 关键词搜索、热门商品缓存（Redis） |

---

## 二、技术选型

### 运行环境
- **Node.js** v18.x LTS

### 核心框架
- **Express.js** v4.x — 轻量级 Web 框架，路由清晰，中间件生态丰富

### 身份认证
- **JWT（jsonwebtoken）** — 无状态 Token 认证，适合前后端分离架构
- **bcryptjs** — 密码哈希加密

### 数据库
- **MySQL 8.0** — 主数据库，存储用户、商品、订单等结构化数据
- **mysql2** — MySQL 驱动，支持 Promise/async-await
- **Redis** — 缓存层，用于 Session 缓存与热门商品缓存

### 文件处理
- **Multer** — 处理 multipart/form-data，实现商品图片上传

### 工具库
- **dotenv** — 环境变量管理
- **cors** — 跨域资源共享
- **express-validator** — 请求参数校验
- **morgan** — HTTP 请求日志

### 开发工具
- **nodemon** — 开发环境热重载
- **ESLint** — 代码规范检查

---

## 三、目录结构

```
backend/
├── src/
│   ├── app.js              # Express 应用入口，注册中间件与路由
│   ├── server.js           # 服务启动入口
│   ├── config/
│   │   ├── db.js           # MySQL 数据库连接配置
│   │   └── redis.js        # Redis 连接配置
│   ├── routes/             # 路由层
│   │   ├── auth.routes.js      # 认证相关路由 /api/auth
│   │   ├── product.routes.js   # 商品相关路由 /api/products
│   │   ├── order.routes.js     # 订单相关路由 /api/orders
│   │   └── upload.routes.js    # 文件上传路由 /api/upload
│   ├── controllers/        # 控制器层（处理请求/响应）
│   │   ├── auth.controller.js
│   │   ├── product.controller.js
│   │   ├── order.controller.js
│   │   └── upload.controller.js
│   ├── services/           # 业务逻辑层
│   │   ├── auth.service.js
│   │   ├── product.service.js
│   │   └── order.service.js
│   ├── models/             # 数据模型层（SQL 操作）
│   │   ├── user.model.js
│   │   ├── product.model.js
│   │   └── order.model.js
│   ├── middlewares/        # 中间件
│   │   ├── auth.middleware.js   # JWT 鉴权中间件
│   │   ├── validate.middleware.js # 参数校验中间件
│   │   └── upload.middleware.js  # 文件上传中间件
│   └── utils/              # 工具函数
│       ├── response.js         # 统一响应格式封装
│       └── jwt.js              # JWT 工具函数
├── sql/
│   └── init.sql            # 数据库初始化脚本
├── .env.example            # 环境变量示例
├── package.json
└── README.md
```

---

## 四、运行方式

### 4.1 环境准备

确保本地已安装：
- Node.js >= 18.0.0
- MySQL 8.0
- Redis 6.x+

### 4.2 安装依赖

```bash
cd backend
npm install
```

### 4.3 配置环境变量

复制 `.env.example` 为 `.env`，并填写对应配置：

```bash
cp .env.example .env
```

`.env` 配置项说明：

```env
# 服务端口
PORT=3000

# JWT 密钥
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# MySQL 配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=campus_trade

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 文件上传目录
UPLOAD_DIR=uploads/
```

### 4.4 初始化数据库

```bash
mysql -u root -p campus_trade < sql/init.sql
```

### 4.5 启动服务

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm start
```

服务默认运行在 `http://localhost:3000`

### 4.6 接口测试

服务启动后，可访问以下地址验证：

```
GET http://localhost:3000/api/health
```

返回 `{"status":"ok"}` 表示服务正常运行。

---

## 五、数据库设计概览

### 用户表 `users`
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | 用户 ID |
| username | VARCHAR(50) UNIQUE | 用户名 |
| email | VARCHAR(100) UNIQUE | 邮箱 |
| password_hash | VARCHAR(255) | 密码哈希 |
| avatar | VARCHAR(255) | 头像 URL |
| created_at | DATETIME | 注册时间 |

### 商品表 `products`
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | 商品 ID |
| seller_id | INT FK | 卖家 ID |
| title | VARCHAR(100) | 商品标题 |
| description | TEXT | 商品描述 |
| price | DECIMAL(10,2) | 价格 |
| category | VARCHAR(50) | 分类 |
| images | JSON | 图片 URL 数组 |
| status | ENUM | `on_sale` / `sold` / `off_shelf` |
| created_at | DATETIME | 发布时间 |

### 订单表 `orders`
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | 订单 ID |
| product_id | INT FK | 商品 ID |
| buyer_id | INT FK | 买家 ID |
| seller_id | INT FK | 卖家 ID |
| price | DECIMAL(10,2) | 成交价格 |
| status | ENUM | `pending` / `confirmed` / `cancelled` |
| created_at | DATETIME | 下单时间 |

---

## 六、注意事项

1. **不要**将 `.env` 文件提交到 Git，已在 `.gitignore` 中忽略
2. 所有接口均需在 Header 中携带 `Authorization: Bearer <token>` 进行鉴权（除注册/登录接口）
3. 图片上传大小限制为 **5MB**，支持 `jpg`、`png`、`webp` 格式
4. 详细 API 接口文档见 [api.md](./api.md)
