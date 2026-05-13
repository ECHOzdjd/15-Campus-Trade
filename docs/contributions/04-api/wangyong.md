# API 设计与实现贡献说明 - 后端部分

**姓名：** 王勇  
**学号：** 2312190301  
**角色：** 后端开发  
**日期：** 2026-03-30

---

## 我完成的工作

### 1. API 设计

- [x] **RESTful 规范设计**
  - 遵循 RESTful 原则：名词复数路径、HTTP 方法规范、合理的状态码
  - 统一的 JSON 响应格式：`{ code, message, data }`
  - 完整的错误处理机制

- [x] **用户认证 API**
  - `POST /auth/register` - 用户注册
  - `POST /auth/login` - 用户登录
  - `GET /auth/me` - 获取当前用户信息
  - `PUT /auth/password` - 修改密码
  - 使用 JWT Token 进行身份验证
  - 使用 bcryptjs 进行密码加密

- [x] **产品管理 API**
  - `GET /products` - 获取产品列表（支持分页、搜索、筛选、排序）
  - `GET /products/{id}` - 获取产品详情
  - `POST /products` - 创建产品
  - `PUT /products/{id}` - 更新产品
  - `DELETE /products/{id}` - 删除产品
  - `GET /products/my` - 获取个人产品列表
  - 支持的查询参数：page, pageSize, search, category, minPrice, maxPrice, status, sortBy, sortOrder

- [x] **订单管理 API**
  - `POST /orders` - 创建订单
  - `GET /orders` - 获取订单列表（支持角色筛选和状态筛选）
  - `GET /orders/{id}` - 获取订单详情
  - `PUT /orders/{id}/confirm` - 确认订单（卖家发货）
  - `PUT /orders/{id}/cancel` - 取消订单
  - 订单状态流转：pending → shipped → delivered → completed 或 cancelled

- [x] **文件上传 API**
  - `POST /upload/image` - 上传产品图片
  - 支持的格式：jpg, jpeg, png, gif
  - 单文件大小限制：5MB
  - 返回URL而非base64，便于CDN集成

### 2. 文档编写

- [x] **OpenAPI 规范 (docs/api.yaml)**
  - 完整的 OpenAPI 3.0.0 规范
  - 所有 API 端点的详细定义
  - 请求/响应示例
  - Schema 定义（User, Product, Order 等）
  - 安全性定义（JWT Bearer Token）
  - 可通过 Swagger UI 展示

- [x] **API 使用说明 (docs/api.md)**
  - 详细的接口文档
  - 参数说明和示例
  - 错误场景说明
  - 常见问题解答
  - Python、JavaScript 示例代码

### 3. 后端实现

- [x] **认证模块 (authController.js)**
  - 用户注册：参数验证、密码强度检查、重复用户检查
  - 用户登录：邮箱密码验证、JWT Token 签发
  - 获取用户信息：需要有效的 Token
  - 修改密码：旧密码验证、新密码强度检查

- [x] **产品模块 (productsController.js)**
  - 获取列表：支持多条件搜索、分类筛选、价格范围、排序
  - 获取详情：返回完整产品信息和卖家信息
  - 创建产品：参数验证、逻辑校验
  - 更新产品：权限检查（仅卖家可更新自己的产品）
  - 删除产品：权限检查（仅卖家可删除自己的产品）
  - 个人产品列表：只显示当前用户的产品

- [x] **订单模块 (ordersController.js)**
  - 创建订单：参数验证、产品检查
  - 获取列表：支持按角色（买家/卖家）筛选、按状态筛选、分页
  - 获取详情：权限检查（仅买家或卖家可查看）
  - 确认订单：权限检查（仅卖家可确认）、状态检查
  - 取消订单：权限检查、状态检查

- [x] **上传模块 (uploadController.js)**
  - 图片上传：文件类型验证、大小限制
  - 存储管理：自动创建 uploads 目录
  - 文件命名：使用时间戳避免冲突
  - 返回 URL：便于客户端使用

- [x] **路由注册 (routes/)**
  - auth.js：认证相关路由
  - products.js：产品相关路由
  - orders.js：订单相关路由
  - upload.js：文件上传路由（使用 multer 中间件）

### 4. 中间件

- [x] **认证中间件 (authMiddleware.js)**
  - JWT Token 解析和验证
  - 自动注入 req.user 信息
  - 清晰的错误提示

- [x] **错误处理中间件 (errorHandler.js)**
  - 统一错误响应格式
  - HTTP 状态码映射

### 5. 测试

- [x] **Postman 测试集合 (docs/Postman_Collection.json)**
  - 认证模块：4 个测试用例
    - 注册新用户
    - 用户登录
    - 获取当前用户信息
    - 修改密码
  - 产品模块：6 个测试用例
    - 获取产品列表（含过滤）
    - 获取产品详情
    - 创建新产品
    - 更新产品
    - 删除产品
    - 获取个人产品列表
  - 订单模块：5 个测试用例
    - 创建订单
    - 获取订单列表
    - 获取订单详情
    - 确认订单（发货）
    - 取消订单
  - 文件上传模块：1 个测试用例
    - 上传产品图片
  - **总计：16 个测试用例**

---

## 技术栈

- **框架：** Express.js 4.x
- **认证：** JWT (jsonwebtoken)
- **加密：** bcriptjs
- **文件上传：** multer
- **环境配置：** dotenv

---

## API 规范亮点

1. **统一的响应格式**：所有接口都遵循 `{ code, message, data }` 格式，便于客户端统一处理

2. **完善的错误处理**：
   - 400：参数错误或业务规则校验失败
   - 401：未授权或 Token 失效
   - 403：权限不足
   - 404：资源不存在
   - 500：服务器错误

3. **灵活的查询接口**：
   - 产品列表支持多条件组合查询
   - 订单列表支持角色和状态多维度筛选

4. **安全的认证机制**：
   - 密码使用 bcrypits 加密存储
   - JWT Token 的有效期管理
   - 请求拦截器保护敏感接口

5. **友好的文件上传**：
   - 自动验证文件格式和大小
   - 返回可用的 URL 而非 base64
   - 便于后续 CDN 集成

---

## 遇到的问题和解决

1. **问题：** 如何实现 RESTful 的产品列表排序？
   - **解决：** 使用查询参数 `sortBy` 和 `sortOrder`，支持按创建时间或价格排序

2. **问题：** 订单权限管理如何设计？
   - **解决：** 买家和卖家有不同的权限：
     - 买家：可以创建订单、查看自己的订单、取消订单
     - 卖家：可以查看来自买家的订单、确认发货、取消订单

3. **问题：** 如何避免文件上传冲突？
   - **解决：** 使用 `时间戳 + 原始扩展名` 的命名方式

4. **问题：** 产品搜索如何实现模糊匹配？
   - **解决：** 使用字符串的 `include` 方法进行不区分大小写的搜索

---

## 心得体会

1. **API 设计的重要性**：好的 API 设计能够直接影响项目的可维护性和客户端集成的难度。统一的响应格式和清晰的错误提示对于开发效率至关重要。

2. **RESTful 原则的应用**：通过合理的路径设计和 HTTP 方法使用，API 变得直观且易于理解。例如用 `GET /products/my` 代替 `GET /my-products`。

3. **测试的必要性**：通过 Postman 依次测试每个接口，及时发现和修复问题，确保 API 的可靠性。

4. **中间件的便利性**：Express.js 的中间件开发模式使得认证、错误处理等横切关注点的实现变得简洁高效。

5. **文档的价值**：详细的 API 文档和 OpenAPI 规范是前后端协作的基础，能大幅提高开发效率。

---

## 相关文件

- [OpenAPI 规范](../api.yaml)
- [API 使用说明](../api.md)
- [Postman 测试集合](../Postman_Collection.json)
- 后端控制器：`backend/src/controllers/`
- 后端路由：`backend/src/routes/`
- 后端中间件：`backend/src/middlewares/`
