# 后端测试文档

## 测试概述

本项目的后端测试采用 **Jest** 作为测试框架，**Supertest** 用于 API 接口测试。测试覆盖了核心业务逻辑单元测试和 API 集成测试，确保后端服务的稳定性和可靠性。

## 技术选型

| 技术 | 版本 | 用途 |
|------|------|------|
| Jest | 30.3.0 | 测试框架 + 断言 + Mock |
| Supertest | 7.2.2 | HTTP 接口测试 |
| Node.js | 18.20.8 | 运行环境 |

## 测试结构

```
backend/tests/
├── setup.js                 # 测试环境配置
├── unit/                    # 单元测试
│   ├── authMiddleware.test.js   # JWT 认证中间件测试
│   ├── userModel.test.js        # 用户模型测试
│   └── productModel.test.js     # 商品模型测试
└── integration/             # 集成测试
    └── api.test.js              # API 接口测试
```

## 测试统计

| 测试类型 | 数量 | 覆盖内容 |
|----------|------|----------|
| 单元测试 | 20 | authMiddleware(4) + userModel(8) + productModel(8) |
| API 测试 | 12 | 注册、登录、商品CRUD、鉴权、错误处理 |
| **总计** | **32** | ✅ 全部通过 |

## 测试覆盖详情

### 单元测试（含 Mock）

#### 1. authMiddleware 中间件测试（4 个）
- 无 Authorization 头返回 401
- Authorization 格式错误返回 401
- Token 无效返回 401
- Token 有效时设置 req.user 并调用 next

#### 2. userModel 模型测试（8 个）
- findByEmail 查找用户成功
- findByEmail 用户不存在返回 null
- checkEmailExists 邮箱存在
- checkUsernameExists 用户名不存在
- create 创建用户返回 ID
- findById 查找用户（不含密码）
- updatePassword 更新密码
- update 更新用户信息

#### 3. productModel 模型测试（8 个）
- findAll 分页查询商品
- findAll 带搜索条件
- findById 查询商品详情
- findById 商品不存在返回 null
- create 创建商品
- update 更新商品
- delete 软删除商品
- findByUserId 查询用户商品

### API 接口测试（12 个）

| 接口 | 方法 | 测试场景 |
|------|------|----------|
| /api/auth/register | POST | 注册成功 |
| /api/auth/register | POST | 缺少必填字段 |
| /api/auth/register | POST | 密码强度不足 |
| /api/auth/login | POST | 登录成功 |
| /api/auth/login | POST | 密码错误 |
| /api/products | GET | 获取商品列表 |
| /api/auth/me | GET | 获取用户信息（需 Token） |
| /api/auth/me | GET | 无 Token 失败 |
| /api/products | POST | 创建商品成功 |
| /api/products | POST | 无 Token 失败 |
| /api/products/:id | GET | 获取商品详情 |
| /api/products/:id | GET | 商品不存在返回 404 |

## 代码覆盖率

```
------------------------|---------|----------|---------|---------|
File                    | % Stmts | % Branch | % Funcs | % Lines |
------------------------|---------|----------|---------|---------|
All files               |   48.93 |    36.56 |   46.8  |   48.93 |
 src/controllers        |   29.43 |    36.9  |   37.5  |   30.35 |
 src/middlewares        |   73.33 |    40.0  |   50.0  |   73.33 |
 src/models             |   56.66 |    35.39 |   62.5  |   56.46 |
------------------------|---------|----------|---------|---------|
```

## 运行测试

```bash
# 进入后端目录
cd backend

# 运行所有测试
npm test

# 运行测试（监听模式）
npm run test:watch
```

## Mock 策略

### 数据库 Mock
使用 `jest.mock()` 模拟 MySQL 连接池，避免测试时操作真实数据库：

```javascript
jest.mock('../../src/config/db', () => ({
  query: mockQuery
}))
```

### JWT Mock
模拟 jsonwebtoken 模块进行 Token 验证测试：

```javascript
jest.mock('jsonwebtoken')
```

## 测试最佳实践

1. **隔离测试**：每个测试用例独立运行，使用 `beforeEach` 重置 Mock 状态
2. **参数化验证**：测试边界条件和异常情况
3. **数据库隔离**：集成测试使用独立测试数据库
4. **清理测试数据**：测试后清理创建的测试数据

## 后续优化建议

1. 增加订单模块（ordersController、orderModel）的测试覆盖
2. 添加文件上传接口的测试
3. 引入测试数据库，实现完整的集成测试
4. 配置 CI/CD 流水线自动运行测试
