# 后端开发贡献说明

**姓名：** 王勇  
**学号：** 2312190301  
**角色：** 后端开发  
**日期：** 2026-04-13

---

## 我完成的工作

### API 实现

- [x] **用户认证 API（注册 / 登录）**
  - `POST /api/auth/register` - 用户注册
  - `POST /api/auth/login` - 用户登录
  - `GET /api/auth/me` - 获取当前用户信息
  - `PUT /api/auth/password` - 修改密码
  - 使用 JWT Token 进行身份验证
  - 使用 bcryptjs 进行密码加密

- [x] **商品管理 CRUD**
  - `GET /api/products` - 获取商品列表（支持搜索、分类、价格过滤、排序、分页）
  - `GET /api/products/:id` - 获取商品详情
  - `POST /api/products` - 创建商品
  - `PUT /api/products/:id` - 更新商品
  - `DELETE /api/products/:id` - 删除商品
  - `GET /api/products/my` - 获取个人商品列表
  - 支持 JSON 字段存储商品图片数组

- [x] **订单管理 CRUD**
  - `POST /api/orders` - 创建订单（使用事务）
  - `GET /api/orders` - 获取订单列表（支持买家/卖家视图、状态过滤）
  - `GET /api/orders/:id` - 获取订单详情
  - `PUT /api/orders/:id/confirm` - 确认订单
  - `PUT /api/orders/:id/cancel` - 取消订单（使用事务恢复商品状态）

- [x] **统一错误响应**
  - 所有接口统一返回 `{ code, message, data }` 格式
  - 使用错误处理中间件统一处理异常

### 数据库

- [x] **数据模型定义**
  - users 表：用户信息（id, username, email, password, phone, avatar, created_at, updated_at）
  - products 表：商品信息（id, user_id, title, description, price, category, condition, images(JSON), status, created_at, updated_at）
  - orders 表：订单信息（id, buyer_id, seller_id, product_id, status, created_at, updated_at）
  - 完整的外键约束和索引设计

- [x] **Models 层实现**
  - `userModel.js` - 用户数据库操作（注册、登录、查询、更新密码）
  - `productModel.js` - 商品数据库操作（CRUD、复杂查询、分页）
  - `orderModel.js` - 订单数据库操作（CRUD、事务支持）
  - 使用 mysql2/promise 进行数据库操作
  - 所有查询使用参数化防止 SQL 注入

- [x] **数据库迁移脚本**
  - `init-db.sql` - 建表 SQL（从 docs/database.md 复制）
  - `seed-data.sql` - 测试数据（5 个用户、12 个商品、5 个订单）
  - 所有测试用户密码：Password123!

### 部署

- [x] **Dockerfile 编写**
  - 基于 node:18-alpine 镜像
  - 多阶段构建优化镜像大小
  - 自动创建 uploads 目录
  - 暴露 3000 端口

- [x] **docker-compose.yml 配置**
  - MySQL 8.0 服务（自动初始化数据库）
  - 后端服务（依赖 MySQL 健康检查）
  - 数据卷持久化（mysql-data、uploads）
  - 网络配置（campus-trade-network）
  - 环境变量配置

- [x] **本地联调验证**
  - 使用 docker-compose up 一键启动所有服务
  - 验证数据库自动初始化
  - 验证 API 接口功能
  - 验证事务处理（订单创建、取消）

---

## 技术栈

- **框架：** Node.js 18 + Express.js 4
- **数据库：** MySQL 8.0
- **认证：** JWT (jsonwebtoken) + bcryptjs
- **数据库客户端：** mysql2/promise（连接池）
- **文件上传：** Multer
- **容器化：** Docker + Docker Compose
- **环境配置：** dotenv

---

## 技术亮点

### 1. 事务处理

在订单创建和取消时使用 MySQL 事务确保数据一致性：

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
}
```

### 2. SQL 注入防护

所有数据库查询使用参数化查询：

```javascript
const [rows] = await pool.query(
  'SELECT * FROM users WHERE email = ?',
  [email]
)
```

### 3. 复杂查询优化

商品列表支持多条件组合查询：

```javascript
// 支持搜索、分类、价格范围、状态、排序、分页
const { products, total } = await productModel.findAll({
  search: '自行车',
  category: '交通工具',
  minPrice: 100,
  maxPrice: 500,
  status: 'available',
  sortBy: 'price',
  sortOrder: 'ASC',
  page: 1,
  pageSize: 20
})
```

### 4. JSON 字段处理

商品图片数组使用 JSON 字段存储：

```javascript
// 存储
images: JSON.stringify(['url1', 'url2'])

// 查询
images: row.images ? JSON.parse(row.images) : []
```

### 5. Docker 自动初始化

docker-compose 配置自动执行数据库初始化脚本：

```yaml
volumes:
  - ./backend/src/scripts/init-db.sql:/docker-entrypoint-initdb.d/01-init-db.sql
  - ./backend/src/scripts/seed-data.sql:/docker-entrypoint-initdb.d/02-seed-data.sql
```

---

## 遇到的问题和解决

### 1. 问题：如何确保订单创建和商品状态更新的原子性？

**解决：** 使用 MySQL 事务处理，在事务中使用 `FOR UPDATE` 锁定商品行，防止并发创建订单导致超卖。

```javascript
const product = await orderModel.checkProductAvailability(productId, connection)
// SELECT ... FOR UPDATE 锁定行
```

### 2. 问题：如何处理商品图片数组的存储？

**解决：** 使用 MySQL 8.0 的 JSON 字段类型，存储时使用 `JSON.stringify()`，查询时使用 `JSON.parse()`。

### 3. 问题：Docker 容器中后端服务如何连接 MySQL？

**解决：** 在 docker-compose 中配置服务依赖和健康检查，后端服务等待 MySQL 健康检查通过后再启动。数据库主机名使用服务名 `mysql` 而不是 `localhost`。

### 4. 问题：如何在 Docker 中自动初始化数据库？

**解决：** 将 SQL 脚本挂载到 MySQL 容器的 `/docker-entrypoint-initdb.d/` 目录，MySQL 会在首次启动时按字母顺序自动执行这些脚本。

### 5. 问题：如何防止 SQL 注入攻击？

**解决：** 所有数据库查询使用参数化查询（`?` 占位符），不使用字符串拼接构建 SQL。对于动态排序字段，使用白名单验证。

---

## 心得体会

### 1. 数据库设计的重要性

良好的数据库设计是项目成功的基础。通过合理的表结构设计、外键约束和索引优化，可以大幅提升查询性能和数据一致性。

### 2. 事务处理的必要性

在涉及多表操作的业务场景中（如订单创建），事务处理是确保数据一致性的关键。使用 `FOR UPDATE` 锁定行可以有效防止并发问题。

### 3. Models 层的价值

将数据库操作封装到 Models 层，使得 Controllers 层更加简洁，业务逻辑更加清晰。同时便于单元测试和代码复用。

### 4. Docker 化部署的便利性

通过 Docker Compose 配置，前端开发者可以一键启动完整的后端服务（MySQL + API），无需手动安装和配置数据库，大幅提升开发效率。

### 5. 参数化查询的安全性

SQL 注入是 Web 应用最常见的安全漏洞之一。使用参数化查询可以从根本上防止 SQL 注入攻击，这是后端开发的基本安全实践。

### 6. 测试数据的重要性

丰富的测试数据（5 个用户、12 个商品、5 个订单）可以帮助前端开发者快速验证各种业务场景，提升前后端协作效率。

---

## 相关文件

### 数据库相关
- [数据库设计文档](../../database.md)
- [建表 SQL](../../backend/src/scripts/init-db.sql)
- [测试数据 SQL](../../backend/src/scripts/seed-data.sql)

### Models 层
- [用户模型](../../backend/src/models/userModel.js)
- [商品模型](../../backend/src/models/productModel.js)
- [订单模型](../../backend/src/models/orderModel.js)

### Controllers 层
- [认证控制器](../../backend/src/controllers/authController.js)
- [商品控制器](../../backend/src/controllers/productsController.js)
- [订单控制器](../../backend/src/controllers/ordersController.js)

### Docker 配置
- [Dockerfile](../../backend/Dockerfile)
- [docker-compose.yml](../../docker-compose.yml)
- [环境变量示例](../../backend/.env.example)

---

## 测试账号

所有测试用户密码均为：`Password123!`

| 邮箱 | 用户名 | 学号 |
|------|--------|------|
| user1@campustrade.com | 王勇 | 2312190301 |
| user2@campustrade.com | 李明 | 2312190302 |
| user3@campustrade.com | 张华 | 2312190303 |
| user4@campustrade.com | 刘芳 | 2312190304 |
| user5@campustrade.com | 陈静 | 2312190305 |

---

## 快速启动

```bash
# 1. 克隆项目
git clone <repository-url>
cd 15-Campus-Trade

# 2. 启动所有服务（MySQL + 后端）
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 查看后端日志
docker-compose logs -f backend

# 5. 测试 API
curl http://localhost:3000/api/health

# 6. 停止服务
docker-compose down
```

---

## 数据库连接信息

### Docker 环境
- 主机：mysql（容器内）或 localhost（宿主机）
- 端口：3306
- 用户：campustrade
- 密码：从本地 `.env` 的 `MYSQL_PASSWORD` 读取
- 数据库：campus_trade

### 本地开发环境
参考 `backend/.env.example` 配置本地 MySQL 连接信息。
