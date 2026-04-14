# 后端模块说明文档

> **负责人：** 王勇（ywang）  
> **学号：** 2312190301  
> **更新时间：** 2026-04-13

---

## 一、模块功能概述

后端负责为校园二手交易平台提供稳定、安全的数据接口服务，主要承担以下职责：

| 功能模块 | 说明 | 实现状态 |
|----------|------|----------|
| 用户认证 | 注册、登录、JWT 鉴权、密码加密 | ✅ 已完成 |
| 商品管理 | 商品发布、编辑、删除、分页查询、分类筛选、搜索 | ✅ 已完成 |
| 订单管理 | 创建订单、查看订单状态、确认订单、取消订单 | ✅ 已完成 |
| 文件上传 | 商品图片上传（本地存储） | ✅ 已完成 |
| 数据库集成 | MySQL 真实数据库操作、事务处理 | ✅ 已完成 |
| Docker 部署 | 容器化部署、自动初始化数据库 | ✅ 已完成 |

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
- **mysql2/promise** — MySQL 驱动，支持 Promise/async-await 和连接池

### 文件处理
- **Multer** — 处理 multipart/form-data，实现商品图片上传

### 容器化
- **Docker** — 容器化部署
- **Docker Compose** — 多容器编排（MySQL + 后端服务）

### 工具库
- **dotenv** — 环境变量管理
- **cors** — 跨域资源共享

### 开发工具
- **nodemon** — 开发环境热重载

---

## 三、目录结构

```
backend/
├── src/
│   ├── app.js                  # Express 应用入口，注册中间件与路由
│   ├── config/
│   │   └── db.js               # MySQL 数据库连接池配置
│   ├── routes/                 # 路由层
│   │   ├── auth.js             # 认证相关路由 /api/auth
│   │   ├── products.js         # 商品相关路由 /api/products
│   │   ├── orders.js           # 订单相关路由 /api/orders
│   │   └── upload.js           # 文件上传路由 /api/upload
│   ├── controllers/            # 控制器层（处理请求/响应）
│   │   ├── authController.js
│   │   ├── productsController.js
│   │   ├── ordersController.js
│   │   └── uploadController.js
│   ├── models/                 # 数据模型层（数据库操作）
│   │   ├── userModel.js        # 用户表 CRUD
│   │   ├── productModel.js     # 商品表 CRUD
│   │   └── orderModel.js       # 订单表 CRUD
│   ├── middlewares/            # 中间件
│   │   ├── authMiddleware.js   # JWT 鉴权中间件
│   │   └── errorHandler.js     # 统一错误处理中间件
│   └── scripts/                # 数据库脚本
│       ├── init-db.sql         # 建表 SQL
│       └── seed-data.sql       # 测试数据 SQL
├── uploads/                    # 文件上传目录
├── Dockerfile                  # Docker 镜像构建文件
├── .dockerignore               # Docker 忽略文件
├── .env.example                # 环境变量示例
├── package.json
└── README.md
```

---

## 四、运行方式

### 4.1 使用 Docker Compose（推荐）

这是最简单的启动方式，会自动启动 MySQL 和后端服务，并初始化数据库。

```bash
# 1. 进入项目根目录
cd 15-Campus-Trade

# 2. 启动所有服务（MySQL + 后端）
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 查看后端日志
docker-compose logs -f backend

# 5. 停止服务
docker-compose down

# 6. 停止服务并删除数据卷
docker-compose down -v
```

服务启动后：
- 后端 API：`http://localhost:3001`
- MySQL：`localhost:3306`（用户名：campustrade，密码：campustrade2026）

### 4.2 本地开发环境

如果需要在本地开发环境运行（不使用 Docker）：

#### 环境准备

确保本地已安装：
- Node.js >= 18.0.0
- MySQL 8.0

#### 安装依赖

```bash
cd backend
npm install
```

#### 配置环境变量

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

# MySQL 配置（本地开发）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=campus_trade

# 文件上传目录
UPLOAD_DIR=uploads/
```

#### 初始化数据库

```bash
# 1. 创建数据库并初始化表结构
mysql -u root -p < backend/src/scripts/init-db.sql

# 2. 插入测试数据
mysql -u root -p campus_trade < backend/src/scripts/seed-data.sql
```

#### 启动服务

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm start
```

服务默认运行在 `http://localhost:3001`

### 4.3 接口测试

服务启动后，可访问以下地址验证：

```bash
# 健康检查
curl http://localhost:3001/api/health

# 登录测试（使用测试账号）
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@campustrade.com","password":"Password123!"}'

# 获取商品列表
curl http://localhost:3001/api/products
```

### 4.4 测试账号

所有测试用户密码均为：`Password123!`

| 邮箱 | 用户名 |
|------|--------|
| user1@campustrade.com | 王勇 |
| user2@campustrade.com | 李明 |
| user3@campustrade.com | 张华 |
| user4@campustrade.com | 刘芳 |
| user5@campustrade.com | 陈静 |

---

## 五、数据库设计概览

### 用户表 `users`
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | 用户 ID |
| username | VARCHAR(50) UNIQUE | 用户名 |
| email | VARCHAR(100) UNIQUE | 邮箱 |
| password | VARCHAR(255) | 密码哈希（bcrypt） |
| phone | VARCHAR(20) | 手机号 |
| avatar | VARCHAR(500) | 头像 URL |
| created_at | TIMESTAMP | 注册时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 商品表 `products`
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | 商品 ID |
| user_id | INT FK | 卖家 ID（关联 users.id） |
| title | VARCHAR(100) | 商品标题 |
| description | TEXT | 商品描述 |
| price | DECIMAL(10,2) | 价格 |
| category | VARCHAR(50) | 分类 |
| condition | ENUM | 成色：new/like_new/good/fair |
| images | JSON | 图片 URL 数组 |
| status | ENUM | available/sold/removed |
| created_at | TIMESTAMP | 发布时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 订单表 `orders`
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | 订单 ID |
| buyer_id | INT FK | 买家 ID（关联 users.id） |
| seller_id | INT FK | 卖家 ID（关联 users.id） |
| product_id | INT FK | 商品 ID（关联 products.id） |
| status | ENUM | pending/confirmed/cancelled |
| created_at | TIMESTAMP | 下单时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 数据库特性

- **外键约束**：确保数据完整性（CASCADE 删除用户时删除其商品，RESTRICT 防止删除有订单的用户/商品）
- **索引优化**：为高频查询字段（email、category、status、user_id 等）创建索引
- **JSON 字段**：使用 MySQL 8.0 的 JSON 类型存储商品图片数组
- **事务支持**：订单创建和取消使用事务确保数据一致性

---

## 六、架构设计

### 6.1 分层架构

```
┌─────────────────────────────────────┐
│         Routes（路由层）             │  定义 API 端点和路由规则
├─────────────────────────────────────┤
│      Controllers（控制器层）         │  处理请求/响应，参数验证
├─────────────────────────────────────┤
│        Models（数据模型层）          │  数据库操作（CRUD）
├─────────────────────────────────────┤
│      Middlewares（中间件层）         │  认证、错误处理、日志
└─────────────────────────────────────┘
```

### 6.2 Models 层设计

所有数据库操作封装在 Models 层，使用 mysql2/promise 进行异步操作：

- **userModel.js**：用户 CRUD、邮箱/用户名唯一性检查、密码更新
- **productModel.js**：商品 CRUD、复杂查询（搜索、筛选、排序、分页）、状态更新
- **orderModel.js**：订单 CRUD、事务支持、商品可用性检查

### 6.3 事务处理

订单创建和取消使用 MySQL 事务确保数据一致性：

```javascript
// 创建订单：订单 + 商品状态更新
const connection = await pool.getConnection()
await connection.beginTransaction()
try {
  // 1. 检查商品状态（FOR UPDATE 锁定）
  // 2. 创建订单
  // 3. 更新商品状态为 sold
  await connection.commit()
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  connection.release()
}
```

### 6.4 安全措施

- **密码加密**：使用 bcryptjs 进行密码哈希（salt rounds = 10）
- **JWT 认证**：无状态 Token 认证，有效期 7 天
- **SQL 注入防护**：所有查询使用参数化查询（`?` 占位符）
- **权限控制**：商品和订单操作验证用户权限
- **输入验证**：参数类型、长度、格式验证

---

## 七、注意事项

1. **不要**将 `.env` 文件提交到 Git，已在 `.gitignore` 中忽略
2. 所有接口均需在 Header 中携带 `Authorization: Bearer <token>` 进行鉴权（除注册/登录接口）
3. 图片上传大小限制为 **5MB**，支持 `jpg`、`jpeg`、`png`、`gif` 格式
4. 详细 API 接口文档见 [api.md](./api.md)
5. 数据库设计文档见 [database.md](./database.md)
6. Docker 部署时数据库会自动初始化（建表 + 测试数据）
7. 测试数据包含 5 个用户、12 个商品、5 个订单，覆盖各种业务场景

---

## 八、相关文档

- [API 接口文档](./api.md)
- [数据库设计文档](./database.md)
- [系统架构设计](./architecture.md)
- [后端开发贡献说明](./contributions/05-backend/wangyong.md)
