# 第三阶段贡献说明 — 架构设计

**姓名**：王勇
**学号**：2312190301
**日期**：2026-03-25
**阶段**：03 — 架构设计与开发环境搭建

---

## 一、完成的工作

### 1. CLAUDE.md — AI 辅助开发规则文件

编写了项目根目录的 `CLAUDE.md`，作为全项目 AI 辅助开发的统一规范文件，内容包括：

- **技术栈声明**：明确前后端所有依赖版本（Vue 3 / Element Plus 2 / Node.js 18 / MySQL 8.0 等）
- **目录结构规范**：分别定义 `frontend/src/` 和 `backend/src/` 的标准分层结构
- **代码规范**：前端使用 `<script setup>` 组合式 API，后端统一响应格式、错误处理中间件
- **API 规范**：Bearer Token 鉴权方式、Base URL 约定
- **禁止事项**：禁止明文存储密码、禁止提交 `.env`、禁止硬编码 API 地址等 8 条红线

### 2. docs/architecture.md — 系统架构设计文档

编写了完整的架构设计文档，包含 6 个 Mermaid 图表：

- **系统整体架构图**：展示 Client → Nginx → Express → MySQL/Redis/OSS 的完整链路
- **前端层次架构图**：Views → Components → Stores（Pinia）→ API 层的分层关系
- **后端模块架构图**：路由 → Controller → Service → Model → DB 的分层关系
- **中间件链说明**：CORS / morgan / authMiddleware 的执行顺序
- **3 个核心交互时序图**：登录流程、发布商品流程、创建订单流程

同时汇总了完整的技术选型对比表，说明每项技术的选择理由。

### 3. docs/database.md — 数据库设计文档

基于已规划的业务需求，设计并编写了完整的数据库文档：

- **ER 图**（Mermaid erDiagram）：直观展示 users、products、orders 三表之间的关联关系
- **字段说明表**：每张表的所有字段、类型、约束、业务含义
- **完整建表 SQL**：可直接在 MySQL 8.0 执行，包含字符集、存储引擎、索引、外键约束
- **索引设计**：针对高频查询场景（按用户查商品、按状态筛商品、按买卖家查订单）设计了 8 个索引
- **业务规则约束**：商品状态流转、订单状态流转、一商品一订单等 5 条业务约束

### 4. backend/ 目录结构初始化

在已有 `.env.example` 的基础上，初始化了后端项目的完整代码骨架：

| 文件 | 说明 |
|------|------|
| `package.json` | 声明所有依赖（express / mysql2 / redis / jwt / bcryptjs / multer 等） |
| `src/app.js` | Express 应用入口，注册中间件和路由 |
| `src/config/db.js` | MySQL 连接池配置，读取 `.env` 环境变量 |
| `src/middlewares/authMiddleware.js` | JWT 鉴权中间件 |
| `src/middlewares/errorHandler.js` | 统一错误处理中间件 |
| `src/routes/` | 路由目录（待各模块实现） |
| `src/controllers/` | 控制器目录 |
| `src/services/` | 业务逻辑目录 |
| `src/models/` | 数据库操作目录 |


### 5. README.md 更新

更新了团队分工表，新增"阶段贡献"列，反映每位成员在各阶段的实际贡献；同步更新技术栈表格，将前端 UI 库从 Vant 修正为 Element Plus。

---

## 二、设计决策说明

### 决策 1：数据库分层设计（Model 层独立）

**问题**：是否直接在 Controller 中写 SQL？
**决策**：严格按 Controller → Service → Model 三层分离，Model 层封装所有 SQL 操作。
**理由**：方便后续单元测试 mock，同时避免 SQL 逻辑散落在业务代码中，降低维护成本。

### 决策 2：JWT 无状态 vs Session 有状态

**问题**：认证方案选 JWT 还是 Session + Redis？
**决策**：采用 JWT，Token 存储在前端 localStorage，请求时通过 Authorization Header 传递。
**理由**：前后端完全分离，无需服务端存储 Session，水平扩展更简单；Redis 保留用于缓存热门商品。

### 决策 3：统一错误响应格式

**问题**：各接口的错误响应格式不一致怎么办？
**决策**：所有错误统一通过 `errorHandler` 中间件返回 `{ code, message, data: null }` 格式。
**理由**：前端只需在 Axios 响应拦截器中处理一种格式，减少页面层的冗余判断代码。

---

## 三、遇到的问题与解决方案

### 问题 1：orders 表中 seller_id 冗余

**现象**：`orders` 表同时有 `buyer_id` 和 `seller_id`，而 `seller_id` 可以从 `products.user_id` 推导出来。
**解决**：保留 `seller_id` 冗余字段。查询"我卖出的订单"时，若无 `seller_id` 则需要 JOIN products 表，性能较差；冗余一列换取查询效率，符合读多写少的业务场景。

### 问题 2：图片字段类型选择

**现象**：商品支持多张图片，如何存储？
**解决**：使用 MySQL 8.0 原生 JSON 类型存储图片 URL 数组，无需额外建图片关联表，简化结构；后端在写入前做数组长度校验（最多 5 张）。

### 问题 3：前后端如何共享 API 地址配置

**现象**：开发环境和生产环境的 API 地址不同，不能硬编码。
**解决**：前端通过 `import.meta.env.VITE_API_BASE_URL` 读取环境变量，后端通过 `process.env.PORT` 读取端口，配置统一放在 `.env` / `.env.local` 文件中，`.env.example` 提供模板，`.env` 加入 `.gitignore`。

---

## 四、心得体会

本阶段的核心收获是理解了"文档驱动开发"的价值。在动手写代码之前，先通过架构图把整个系统的层次和数据流梳理清楚，可以避免后期大规模重构。

数据库设计是后端开发的地基——字段类型、索引、约束的选择会直接影响后续查询的性能和代码的复杂度。这次认真考虑了外键约束和索引策略，也在 CLAUDE.md 中将这些决策固化为规范，希望能为后续的功能开发打好基础。
