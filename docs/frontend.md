# 前端模块说明文档

> **负责人：** 马俊琛  
> **更新时间：** 2026-03-09

---

## 一、模块功能概述

前端负责为校园二手交易平台提供用户界面，通过调用后端 REST API 实现数据交互，主要承担以下职责：

| 功能模块 | 说明 |
|----------|------|
| 用户认证 | 注册、登录、个人信息查看与密码修改 |
| 商品浏览 | 商品列表展示、分类筛选、关键词搜索、商品详情 |
| 商品管理 | 发布商品、编辑商品、下架商品、我的发布列表 |
| 订单管理 | 创建订单、订单列表（买家/卖家视角）、订单详情、确认/取消订单 |
| 图片上传 | 商品图片本地预览与上传 |
| Token 鉴权 | 登录态持久化、请求自动携带 JWT、401 自动跳转登录页 |

---

## 二、技术选型

### 运行环境
- **Node.js** v18.x LTS（用于开发构建）

### 核心框架
- **Vue 3** — 渐进式前端框架，Composition API，响应式系统完善
- **Vite** v5.x — 极速开发服务器与构建工具

### 路由
- **Vue Router** v4.x — 官方路由，支持 History 模式与导航守卫

### 状态管理
- **Pinia** v2.x — Vue 3 官方推荐状态管理库，轻量且类型友好

### 网络请求
- **Axios** v1.x — HTTP 客户端，统一封装请求/响应拦截器

### UI 组件库
- **Element Plus** v2.x — 基于 Vue 3 的企业级 UI 组件库

### 工具库
- **dayjs** — 轻量日期格式化
- **vue-cropper** — 头像裁剪上传

### 开发工具
- **ESLint** + **Prettier** — 代码规范与格式化
- **unplugin-auto-import** — 自动导入 Vue/Pinia API
- **unplugin-vue-components** — Element Plus 组件按需自动导入

---

## 三、目录结构

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── main.js                 # 应用入口，注册插件
│   ├── App.vue                 # 根组件
│   ├── api/                    # API 请求层（对应后端各模块）
│   │   ├── auth.js             # 认证相关请求 /api/auth
│   │   ├── product.js          # 商品相关请求 /api/products
│   │   ├── order.js            # 订单相关请求 /api/orders
│   │   └── upload.js           # 文件上传请求 /api/upload
│   ├── router/
│   │   └── index.js            # 路由配置与导航守卫
│   ├── stores/                 # Pinia 状态管理
│   │   ├── user.js             # 用户信息与登录态
│   │   ├── product.js          # 商品列表与筛选状态
│   │   └── order.js            # 订单状态
│   ├── views/                  # 页面级组件
│   │   ├── auth/
│   │   │   ├── LoginView.vue        # 登录页
│   │   │   └── RegisterView.vue     # 注册页
│   │   ├── product/
│   │   │   ├── ProductListView.vue  # 商品列表/首页
│   │   │   ├── ProductDetailView.vue # 商品详情页
│   │   │   ├── ProductPublishView.vue # 发布商品页
│   │   │   └── ProductEditView.vue  # 编辑商品页
│   │   ├── order/
│   │   │   ├── OrderListView.vue    # 订单列表页
│   │   │   └── OrderDetailView.vue  # 订单详情页
│   │   └── user/
│   │       ├── ProfileView.vue      # 个人中心页
│   │       └── MyProductsView.vue   # 我发布的商品
│   ├── components/             # 可复用组件
│   │   ├── layout/
│   │   │   ├── AppHeader.vue       # 顶部导航栏
│   │   │   └── AppFooter.vue       # 底部页脚
│   │   ├── product/
│   │   │   ├── ProductCard.vue     # 商品卡片
│   │   │   ├── ProductFilter.vue   # 分类/排序筛选栏
│   │   │   └── ImageUploader.vue   # 图片上传组件
│   │   └── common/
│   │       ├── Pagination.vue      # 分页组件
│   │       └── EmptyState.vue      # 空状态占位组件
│   ├── utils/
│   │   ├── request.js          # Axios 实例封装（拦截器）
│   │   └── storage.js          # localStorage Token 读写
│   └── assets/
│       ├── styles/
│       │   └── main.css        # 全局样式
│       └── images/             # 静态图片资源
├── .env.development            # 开发环境变量
├── .env.production             # 生产环境变量
├── vite.config.js              # Vite 配置
├── package.json
└── README.md
```

---

## 四、路由设计

| 路由路径 | 组件 | 是否需要登录 | 说明 |
|----------|------|:----------:|------|
| `/` | `ProductListView` | ❌ | 首页，商品列表 |
| `/login` | `LoginView` | ❌ | 登录页 |
| `/register` | `RegisterView` | ❌ | 注册页 |
| `/products/:id` | `ProductDetailView` | ❌ | 商品详情页 |
| `/products/publish` | `ProductPublishView` | ✅ | 发布商品页 |
| `/products/:id/edit` | `ProductEditView` | ✅ | 编辑商品页 |
| `/orders` | `OrderListView` | ✅ | 订单列表页 |
| `/orders/:id` | `OrderDetailView` | ✅ | 订单详情页 |
| `/profile` | `ProfileView` | ✅ | 个人中心页 |
| `/my-products` | `MyProductsView` | ✅ | 我发布的商品 |

### 导航守卫

在 `router/index.js` 中使用全局前置守卫，检查本地 Token：

```js
router.beforeEach((to) => {
  const userStore = useUserStore()
  if (to.meta.requiresAuth && !userStore.token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})
```

---

## 五、状态管理（Pinia）

### 5.1 用户 Store（`stores/user.js`）

| 状态 | 类型 | 说明 |
|------|------|------|
| `token` | `string \| null` | JWT Token，持久化到 localStorage |
| `userInfo` | `object \| null` | 当前登录用户信息（id、username、avatar 等） |

| Action | 说明 |
|--------|------|
| `login(data)` | 调用登录接口，保存 token 与用户信息 |
| `logout()` | 清除 token 与用户信息，跳转登录页 |
| `fetchProfile()` | 请求 `GET /api/auth/me`，刷新用户信息 |

### 5.2 商品 Store（`stores/product.js`）

| 状态 | 类型 | 说明 |
|------|------|------|
| `list` | `array` | 当前商品列表 |
| `total` | `number` | 总条数 |
| `filters` | `object` | 当前筛选条件（page、category、keyword、sort、order） |

| Action | 说明 |
|--------|------|
| `fetchList(params)` | 调用 `GET /api/products` 获取列表 |
| `resetFilters()` | 重置筛选条件到默认值 |

### 5.3 订单 Store（`stores/order.js`）

| 状态 | 类型 | 说明 |
|------|------|------|
| `list` | `array` | 当前订单列表 |
| `total` | `number` | 总条数 |

| Action | 说明 |
|--------|------|
| `fetchList(params)` | 调用 `GET /api/orders` 获取列表 |
| `createOrder(productId)` | 调用 `POST /api/orders` 创建订单 |

---

## 六、网络请求封装

在 `utils/request.js` 中封装 Axios 实例：

```js
import axios from 'axios'
import { useUserStore } from '@/stores/user'
import router from '@/router'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // http://localhost:3000/api
  timeout: 10000
})

// 请求拦截：自动携带 Token
request.interceptors.request.use((config) => {
  const userStore = useUserStore()
  if (userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`
  }
  return config
})

// 响应拦截：统一处理错误
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useUserStore().logout()
      router.push('/login')
    }
    return Promise.reject(error.response?.data ?? error)
  }
)

export default request
```

---

## 七、运行方式

### 7.1 环境准备

确保本地已安装：
- Node.js >= 18.0.0

后端服务需正常运行，默认监听 `http://localhost:3000`。

### 7.2 安装依赖

```bash
cd frontend
npm install
```

### 7.3 配置环境变量

`.env.development` 示例：

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 7.4 启动开发服务器

```bash
npm run dev
```

默认访问地址：`http://localhost:5173`

### 7.5 构建生产包

```bash
npm run build
```

产物输出至 `dist/` 目录，可部署至静态资源服务器。

### 7.6 代码检查

```bash
# ESLint 检查
npm run lint

# 格式化
npm run format
```

---

## 八、页面与接口对应关系

| 页面 | 调用接口 |
|------|---------|
| 登录页 | `POST /api/auth/login` |
| 注册页 | `POST /api/auth/register` |
| 个人中心 | `GET /api/auth/me`、`PUT /api/auth/password` |
| 商品列表/首页 | `GET /api/products` |
| 商品详情页 | `GET /api/products/:id` |
| 发布商品页 | `POST /api/upload/image`、`POST /api/products` |
| 编辑商品页 | `GET /api/products/:id`、`POST /api/upload/image`、`PUT /api/products/:id` |
| 我的发布 | `GET /api/products/my`、`DELETE /api/products/:id` |
| 订单列表 | `GET /api/orders` |
| 订单详情 | `GET /api/orders/:id`、`PUT /api/orders/:id/confirm`、`PUT /api/orders/:id/cancel` |
| 商品详情（购买） | `POST /api/orders` |

---

## 九、注意事项

1. 所有需要鉴权的请求由 Axios 拦截器自动注入 `Authorization: Bearer <token>`，无需在业务代码中手动添加
2. Token 存储于 `localStorage`，key 为 `campus_trade_token`，刷新页面后自动恢复登录态
3. 图片上传需先调用 `POST /api/upload/image` 获取 URL，再将 URL 写入商品表单提交
4. 商品分类枚举值：`book`（教材书籍）/ `electronics`（数码电器）/ `clothing`（服装）/ `daily`（生活用品）/ `other`（其他）
5. 详细 API 接口文档见 [api.md](./api.md)，后端说明见 [backend.md](./backend.md)
