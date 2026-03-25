# 校园二手交易平台 — 项目规则

> 本文件为 AI 辅助开发规则文件，所有 AI 工具（Claude、Copilot 等）在生成代码时需遵守以下规范。

---

## 项目概述

**项目名称**：校园二手交易平台（Campus Trade）
**目标**：为在校大学生提供移动端响应式 Web 应用，实现二手商品的发布、浏览和交易。

---

## 技术栈

| 层级 | 技术选型 |
|------|---------|
| 前端框架 | Vue 3 + Vite 5 |
| 前端 UI | Element Plus 2 |
| 前端路由 | Vue Router 4 |
| 前端状态管理 | Pinia 2 |
| 前端网络请求 | Axios 1 |
| 后端框架 | Node.js 18 + Express.js 4 |
| 认证方案 | JWT + bcryptjs |
| 主数据库 | MySQL 8.0 |
| 缓存 | Redis |
| 文件上传 | Multer |
| 部署 | PM2（后端）+ Nginx（前端静态文件） |

---

## 目录结构

### 前端（frontend/）

```
frontend/
├── index.html
├── vite.config.js
├── package.json
├── .env.example
└── src/
    ├── main.js            # 应用入口，注册插件
    ├── App.vue            # 根组件
    ├── api/               # 所有接口请求定义
    │   └── index.js       # 按模块导出（auth、products、orders、upload）
    ├── router/            # 路由配置
    │   └── index.js       # 路由定义 + 导航守卫
    ├── stores/            # Pinia 状态管理
    │   ├── user.js        # 用户信息、登录态
    │   ├── product.js     # 商品列表、详情
    │   └── order.js       # 订单列表、详情
    ├── views/             # 页面级组件（与路由一一对应）
    ├── components/        # 可复用子组件
    └── utils/
        └── request.js     # Axios 实例封装 + 拦截器
```

### 后端（backend/）

```
backend/
├── package.json
├── .env.example
└── src/
    ├── app.js             # Express 应用入口
    ├── routes/            # 路由注册（auth、products、orders、upload）
    ├── controllers/       # 控制器（处理请求/响应）
    ├── services/          # 业务逻辑层
    ├── models/            # 数据库操作层
    ├── middlewares/       # 中间件（authMiddleware、errorHandler 等）
    └── config/
        └── db.js          # MySQL 连接配置
```

---

## 代码规范

### 前端

- **组件**：使用 Vue 3 组合式 API（`<script setup>`），不使用 Options API
- **样式**：使用 Element Plus 组件 + scoped CSS，不使用内联 style
- **网络请求**：统一通过 `src/utils/request.js` 的 Axios 封装发起，不直接使用 `fetch` 或裸 `axios`
- **状态管理**：跨组件共享状态放 Pinia store，组件内部状态用 `ref/reactive`
- **路由**：需要登录的页面必须在路由 meta 中配置 `requiresAuth: true`，由导航守卫统一处理

### 后端

- **响应格式**：所有接口统一返回以下 JSON 格式：
  ```json
  { "code": 200, "message": "success", "data": {} }
  ```
- **错误处理**：使用统一的 errorHandler 中间件，不在 controller 中 `res.status(500).send()`
- **鉴权**：需要登录的接口必须通过 `authMiddleware` 中间件保护
- **密码存储**：密码必须使用 `bcryptjs` 哈希后存储，禁止明文

---

## API 规范

- Base URL：`http://localhost:3000/api`
- 认证：使用 Bearer Token（JWT），放在请求头 `Authorization: Bearer <token>`
- 详细接口文档：见 `docs/api.md`

---

## 禁止事项

- 不要修改 `.env` 文件（配置从 `.env.example` 复制）
- 不要在前端代码中硬编码 API 地址（使用 `import.meta.env.VITE_API_BASE_URL`）
- 不要跳过 JWT 鉴权中间件
- 不要使用内联样式（`style="..."`）
- 不要在前端直接操作 DOM（使用 Vue 响应式或组件 ref）
- 不要将用户密码明文存入数据库
- 不要提交 `.env` 文件到 Git
- 不要在 controller 中直接写 SQL（通过 model 层操作数据库）
