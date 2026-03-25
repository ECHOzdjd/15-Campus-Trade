# 系统架构设计文档

**项目**：校园二手交易平台（Campus Trade）
**版本**：v1.0.0
**更新时间**：2026-03-25

---

## 1. 系统整体架构

```mermaid
graph TB
    subgraph Client["客户端"]
        Browser["浏览器 / 移动端"]
    end

    subgraph Frontend["前端层（Vue 3 + Vite）"]
        Nginx["Nginx 静态文件服务器"]
    end

    subgraph Backend["后端层（Node.js + Express）"]
        Express["Express.js 应用服务器\n:3000"]
        PM2["PM2 进程管理"]
    end

    subgraph Database["数据层"]
        MySQL["MySQL 8.0\n主数据库"]
        Redis["Redis\n缓存 / Session"]
        OSS["本地存储 / 阿里云 OSS\n商品图片"]
    end

    Browser --> Nginx
    Browser --> Express
    PM2 --> Express
    Express --> MySQL
    Express --> Redis
    Express --> OSS
```

---

## 2. 前端架构

### 2.1 层次结构

```mermaid
graph TD
    subgraph Views["页面层 views/"]
        Home["首页 HomeView"]
        Detail["商品详情 ProductDetailView"]
        Publish["发布商品 PublishView"]
        Orders["订单列表 OrderListView"]
        Profile["个人中心 ProfileView"]
        Login["登录 LoginView"]
        Register["注册 RegisterView"]
    end

    subgraph Components["组件层 components/"]
        ProductCard["ProductCard 商品卡片"]
        ImageUpload["ImageUpload 图片上传"]
        OrderItem["OrderItem 订单条目"]
        NavBar["NavBar 导航栏"]
    end

    subgraph Stores["状态层 stores/ Pinia"]
        UserStore["userStore\n用户信息 / Token"]
        ProductStore["productStore\n商品列表 / 详情"]
        OrderStore["orderStore\n订单列表 / 详情"]
    end

    subgraph API["接口层 api/ + utils/request.js"]
        AuthAPI["auth API\n登录 / 注册"]
        ProductAPI["products API\n增删改查"]
        OrderAPI["orders API\n创建 / 查询"]
        UploadAPI["upload API\n图片上传"]
    end

    Views --> Components
    Views --> Stores
    Stores --> API
    API --> Router["Vue Router 4\n路由守卫 requiresAuth"]
```

### 2.2 路由设计

| 路径 | 页面 | 是否需要登录 |
|------|------|-------------|
| `/` | 首页商品列表 | 否 |
| `/login` | 登录页 | 否 |
| `/register` | 注册页 | 否 |
| `/product/:id` | 商品详情页 | 否 |
| `/publish` | 发布商品页 | 是 |
| `/product/:id/edit` | 编辑商品页 | 是 |
| `/orders` | 订单列表页 | 是 |
| `/orders/:id` | 订单详情页 | 是 |
| `/profile` | 个人中心页 | 是 |
| `/my-products` | 我的商品页 | 是 |

---

## 3. 后端架构

### 3.1 模块划分

```mermaid
graph TD
    Request["HTTP 请求"] --> AppJS["app.js\nExpress 入口\nCORS / morgan / 路由注册"]

    AppJS --> AuthRoute["routes/auth.js"]
    AppJS --> ProductRoute["routes/products.js"]
    AppJS --> OrderRoute["routes/orders.js"]
    AppJS --> UploadRoute["routes/upload.js"]
    AppJS --> ErrorMiddleware["middlewares/errorHandler.js"]

    AuthRoute --> AuthCtrl["controllers/authController.js"]
    ProductRoute --> AuthMiddleware["middlewares/authMiddleware.js\nJWT 验证"]
    ProductRoute --> ProductCtrl["controllers/productController.js"]
    OrderRoute --> AuthMiddleware
    OrderRoute --> OrderCtrl["controllers/orderController.js"]
    UploadRoute --> AuthMiddleware
    UploadRoute --> UploadCtrl["controllers/uploadController.js"]

    AuthCtrl --> AuthService["services/authService.js"]
    ProductCtrl --> ProductService["services/productService.js"]
    OrderCtrl --> OrderService["services/orderService.js"]

    AuthService --> UserModel["models/userModel.js"]
    ProductService --> ProductModel["models/productModel.js"]
    OrderService --> OrderModel["models/orderModel.js"]

    UserModel --> DB["config/db.js\nMySQL 连接池"]
    ProductModel --> DB
    OrderModel --> DB
```

### 3.2 中间件链

```
请求 → CORS → morgan日志 → express.json() → 路由匹配
                                                   ↓
                                          authMiddleware（需鉴权路由）
                                                   ↓
                                              Controller
                                                   ↓
                                               Service
                                                   ↓
                                                Model
                                                   ↓
                                              MySQL / Redis
```

---

## 4. 数据库架构

详见 [docs/database.md](./database.md)

核心数据表：

- `users` — 用户账户信息
- `products` — 商品信息
- `orders` — 交易订单

---

## 5. 核心交互流程

### 5.1 用户登录流程

```mermaid
sequenceDiagram
    participant U as 用户浏览器
    participant F as 前端 Vue
    participant B as Express 后端
    participant DB as MySQL

    U->>F: 填写邮箱/密码，点击登录
    F->>B: POST /api/auth/login
    B->>DB: SELECT * FROM users WHERE email = ?
    DB-->>B: 返回用户记录
    B->>B: bcrypt.compare(password, hash)
    alt 密码正确
        B-->>F: 200 token + user 信息
        F->>F: userStore.setToken(token)
        F->>U: 跳转到首页
    else 密码错误
        B-->>F: 401 密码错误
        F->>U: 提示错误信息
    end
```

### 5.2 发布商品流程

```mermaid
sequenceDiagram
    participant U as 用户浏览器
    participant F as 前端 Vue
    participant B as Express 后端
    participant Store as 本地/OSS
    participant DB as MySQL

    U->>F: 填写商品信息 + 上传图片
    F->>B: POST /api/upload/image
    B->>Store: Multer 保存文件
    Store-->>B: 返回图片 URL
    B-->>F: 200 图片 URL
    F->>B: POST /api/products（含图片URL）
    Note over B: authMiddleware 验证 JWT
    B->>DB: INSERT INTO products
    DB-->>B: 返回新商品 ID
    B-->>F: 201 商品详情
    F->>U: 发布成功，跳转到商品详情页
```

### 5.3 创建订单流程

```mermaid
sequenceDiagram
    participant U as 用户浏览器
    participant F as 前端 Vue
    participant B as Express 后端
    participant DB as MySQL

    U->>F: 点击"立即购买"
    F->>B: POST /api/orders { productId }
    Note over B: authMiddleware 验证 JWT
    B->>DB: SELECT * FROM products WHERE id = ? AND status = 'available'
    DB-->>B: 商品信息
    B->>DB: INSERT INTO orders (buyer_id, seller_id, product_id, status='pending')
    B->>DB: UPDATE products SET status = 'sold'
    DB-->>B: 成功
    B-->>F: 201 订单详情
    F->>U: 跳转到订单详情页
```

---

## 6. 技术选型汇总

| 层级 | 选择 | 版本 | 理由 |
|------|------|------|------|
| 前端框架 | Vue 3 | 3.x | 组合式 API，响应式设计友好 |
| 前端构建 | Vite | 5.x | 极快的 HMR，ES module 原生支持 |
| 前端 UI | Element Plus | 2.x | Vue 3 官方推荐，组件丰富 |
| 前端路由 | Vue Router | 4.x | 与 Vue 3 配套 |
| 前端状态 | Pinia | 2.x | 轻量，TypeScript 友好 |
| 后端框架 | Express.js | 4.x | 成熟稳定，生态丰富 |
| 后端运行时 | Node.js | 18 LTS | 长期支持版本 |
| 认证 | JWT | — | 无状态，前后端分离友好 |
| 主数据库 | MySQL | 8.0 | 关系型，事务支持，适合订单场景 |
| 缓存 | Redis | — | 高性能，用于热门商品缓存 |
| 文件上传 | Multer | — | Express 生态标准方案 |
| 部署 | PM2 + Nginx | — | 生产环境标准方案 |
