# 第三阶段贡献说明 — 架构设计

**姓名**：马俊琛
**学号**：2312190310
**日期**：2026-03-25
**阶段**：03 — 架构设计与开发环境搭建

---

## 一、完成的工作

### 1. 前端架构设计

在本阶段对前端整体架构进行了系统化梳理，确定了以下分层结构：

| 层级 | 目录 | 职责 |
|------|------|------|
| 页面层 | `src/views/` | 路由对应的完整页面组件，10 个页面 |
| 组件层 | `src/components/` | 可复用子组件（商品卡片、图片上传、订单条目等） |
| 状态层 | `src/stores/` | Pinia Store，管理用户、商品、订单的全局状态 |
| 接口层 | `src/api/` | 按模块封装的 API 调用函数 |
| 工具层 | `src/utils/request.js` | Axios 实例 + 请求/响应拦截器 |

### 2. frontend/ 目录结构初始化

初始化了前端项目的完整代码骨架，包含可直接运行的基础配置：

| 文件 | 说明 |
|------|------|
| `package.json` | 声明所有依赖（vue / vue-router / pinia / axios / element-plus） |
| `vite.config.js` | Vite 配置，含 `/api` 反向代理到后端 3000 端口 |
| `index.html` | HTML 入口 |
| `.env.example` | 环境变量模板，定义 `VITE_API_BASE_URL` |
| `src/main.js` | 注册 Pinia、Vue Router、Element Plus（中文语言包） |
| `src/App.vue` | 根组件，包含 `<router-view>` |
| `src/utils/request.js` | Axios 封装：自动附加 JWT Token，401 自动跳转登录页 |
| `src/api/index.js` | 按模块导出所有 API 方法（auth / products / orders / upload） |
| `src/router/index.js` | 10 个路由定义 + 导航守卫（requiresAuth 检查） |
| `src/stores/user.js` | 用户 Store：Token 持久化、获取用户信息 |
| `src/stores/product.js` | 商品 Store：列表、详情、我的商品 |
| `src/stores/order.js` | 订单 Store：列表、详情 |

### 3. 路由设计规范

完善了路由设计，明确了每个路由的鉴权要求：

| 路径 | 页面 | 需要登录 |
|------|------|---------|
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

导航守卫统一处理：未登录访问需鉴权路由时，自动重定向到 `/login`。

### 4. Axios 拦截器规范

制定了前端网络请求的统一处理规范：

- **请求拦截**：自动从 localStorage 读取 Token，注入 `Authorization: Bearer <token>` 请求头
- **响应拦截**：统一解包 `response.data`（对齐后端 `{ code, message, data }` 格式）；401 响应自动清除 Token 并跳转登录页
- **禁止**：页面组件中不允许直接使用 `fetch` 或裸 `axios`，必须通过 `src/utils/request.js` 发起请求

### 5. Pinia Store 设计规范

为三个核心状态模块制定了统一的设计规范：

- 使用 **Setup Store** 风格（`defineStore` + 组合式函数），与 Vue 3 组合式 API 保持一致
- Store 内部封装异步 API 调用，页面组件只调用 Store 方法，不直接调用 API 函数
- 用户 Token 通过 `localStorage` 持久化，Store 初始化时从本地读取

---

## 二、设计决策说明

### 决策 1：选用 Element Plus 而非 Vant

**问题**：README 最初规划使用 Vant（移动端 UI 库），但 `frontend.md` 中指定了 Element Plus。
**决策**：确认采用 **Element Plus 2**，放弃 Vant。
**理由**：项目定位为"响应式 Web 应用"而非纯移动端 App，Element Plus 的桌面端组件更完整，且已在 `frontend.md` 中正式确认；配合 CSS 媒体查询可满足移动端适配需求。

### 决策 2：API 集中管理 vs 分散在页面

**问题**：是否将每个 API 调用直接写在对应页面组件内？
**决策**：所有 API 调用统一在 `src/api/index.js` 中按模块导出，页面通过 Store 间接调用。
**理由**：接口变更时只需改一处；Store 中可统一处理加载状态和错误提示，减少页面代码冗余。

### 决策 3：导航守卫方案选择

**问题**：鉴权判断放在路由 meta + 全局守卫，还是每个页面组件内部判断？
**决策**：采用路由 meta `requiresAuth: true` + 全局 `beforeEach` 守卫。
**理由**：集中管理，新增需要鉴权的路由只需加一个 meta 字段，无需在每个页面组件中重复写判断逻辑。

---

## 三、遇到的问题与解决方案

### 问题 1：Vite 开发环境跨域问题

**现象**：前端运行在 5173 端口，后端运行在 3000 端口，直接请求会触发 CORS 错误。
**解决**：在 `vite.config.js` 中配置 `server.proxy`，将 `/api` 路径代理到 `http://localhost:3000`，开发环境下请求不会跨域；生产环境由 Nginx 统一反向代理，配置保持一致。

### 问题 2：Token 刷新策略

**现象**：JWT 设置 7 天过期，用户长期使用时 Token 会突然失效，体验不好。
**解决**：当前阶段采用简单方案——Token 过期后拦截器自动跳转登录页，提示用户重新登录。后续可考虑实现 Refresh Token 机制，但本阶段不过度设计。

### 问题 3：Element Plus 中文语言包配置

**现象**：Element Plus 默认语言为英文，日期选择器、分页器等组件显示英文。
**解决**：在 `main.js` 中引入 `element-plus/es/locale/lang/zh-cn` 并通过 `app.use(ElementPlus, { locale: zhCn })` 注入，全局切换为中文。

### 问题 4：Store 与 localStorage 的同步

**现象**：页面刷新后 Pinia Store 状态清空，但 localStorage 中的 Token 还在，导致状态不一致。
**解决**：`useUserStore` 初始化时从 `localStorage.getItem('token')` 读取初始值，确保刷新后 Token 状态恢复；登出时同时清除 Store 和 localStorage。

---

## 四、心得体会

本阶段最大的收获是理解了"分层架构"的意义——不是为了复杂而复杂，而是为了让每一层都有明确的职责边界。当页面只负责展示、Store 只负责状态、API 只负责请求时，代码变更的影响范围就会大大缩小。

初始化目录结构看似简单，但实际上需要考虑很多细节：环境变量怎么管理、请求怎么统一、鉴权逻辑放哪里。这些"骨架"决策一旦确定，后续所有功能开发都会在这个框架内进行，所以值得在早期认真设计。
