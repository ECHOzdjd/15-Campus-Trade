# 前端模块说明文档

> **负责人：** 马俊琛  
> **更新时间：** 2026-04-13

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
│   ├── styles/                 # 样式系统（新增）
│   │   ├── linear-theme.css    # Linear 风格 CSS 变量
│   │   ├── element-override.scss # Element Plus 主题覆盖
│   │   └── global.css          # 全局样式
│   ├── api/                    # API 请求层（对应后端各模块）
│   │   └── index.js            # 统一导出（auth、products、orders、upload）
│   ├── router/
│   │   └── index.js            # 路由配置与导航守卫
│   ├── stores/                 # Pinia 状态管理
│   │   ├── user.js             # 用户信息与登录态
│   │   ├── product.js          # 商品列表与筛选状态
│   │   └── order.js            # 订单状态
│   ├── components/             # 可复用组件（新增）
│   │   ├── AppHeader.vue       # 全局导航栏
│   │   ├── ProductCard.vue     # 商品卡片
│   │   └── ImageUploader.vue   # 图片上传
│   ├── views/                  # 页面级组件
│   │   ├── LoginView.vue       # 登录/注册页（合并）
│   │   ├── HomeView.vue        # 商品列表/首页
│   │   ├── ProductDetailView.vue # 商品详情页
│   │   ├── PublishView.vue     # 发布商品页
│   │   ├── ProfileView.vue     # 个人中心（含我的商品、订单、设置）
│   │   ├── EditProductView.vue # 编辑商品页
│   │   ├── OrderListView.vue   # 订单列表
│   │   ├── OrderDetailView.vue # 订单详情
│   │   └── MyProductsView.vue  # 我的商品
│   ├── utils/
│   │   └── request.js          # Axios 实例封装 + 拦截器
│   └── assets/                 # 静态资源
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

---

## 四、核心功能实现（2026-04-13 更新）

### 4.1 样式系统（Linear 风格深色主题）

采用 Linear 风格的深色主题设计，提供现代化的视觉体验：

#### CSS 变量系统（linear-theme.css）
- 定义完整的设计 token：颜色、字体、圆角、间距、阴影等
- 背景色：`--bg-marketing`（#08090a）、`--bg-panel`（#0f1011）、`--bg-surface`（#191a1b）
- 文字色：`--text-primary`（#f7f8f8）、`--text-secondary`（#d0d6e0）
- 品牌色：`--brand-indigo`（#5e6ad2）、`--accent-violet`（#7170ff）

#### Element Plus 主题覆盖（element-override.scss）
- 覆盖 Element Plus 组件的默认样式
- 保持组件功能，只改变视觉呈现
- 统一使用 CSS 变量确保主题一致性

#### 全局样式（global.css）
- 引入 Inter 字体（Google Fonts）
- 配置 OpenType 特性：`font-feature-settings: "cv01", "ss03"`
- 全局样式重置和工具类
- 响应式断点定义

### 4.2 核心组件

#### AppHeader（全局导航栏）
**功能**：Logo、搜索框、用户菜单、响应式布局  
**特点**：固定定位、集成搜索、移动端适配

#### ProductCard（商品卡片）
**功能**：展示商品信息，支持点击跳转和操作按钮  
**特点**：Hover 效果、时间格式化、状态标签

#### ImageUploader（图片上传）
**功能**：多图上传组件，支持拖拽和点击上传  
**特点**：最多 5 张、预览删除、v-model 双向绑定

### 4.3 页面实现

✅ **LoginView**：登录/注册页面（Tab 切换）  
✅ **HomeView**：首页/商品列表（筛选、排序、分页）  
✅ **ProductDetailView**：商品详情（图片轮播、购买）  
✅ **ProfileView**：个人中心（我的商品、订单、设置）  
✅ **PublishView**：发布商品（表单验证、图片上传）

### 4.4 API 对接

所有页面已完成与后端 API 的对接，包括认证、商品、订单、文件上传等接口。

---

## 五、开发规范

### 5.1 代码规范
- 使用 Vue 3 组合式 API（`<script setup>`）
- 使用 scoped CSS + CSS 变量
- 统一通过 `src/utils/request.js` 发起请求

### 5.2 命名规范
- 组件文件：PascalCase（如 `ProductCard.vue`）
- 普通文件：kebab-case（如 `linear-theme.css`）
- 变量/函数：camelCase（如 `fetchProducts`）

---

## 六、运行与部署
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
