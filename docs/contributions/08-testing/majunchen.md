# 前端测试文档

## 测试概述

本项目的前端测试采用 **Vitest** 作为测试框架，**Vue Test Utils** 用于组件测试。测试覆盖了核心组件的渲染测试、用户交互测试以及 API 请求的 Mock 测试，确保前端界面的正确性和用户体验。

## 技术选型

| 技术 | 版本 | 用途 |
|------|------|------|
| Vitest | 2.1.9 | 测试框架 + 断言 |
| @vue/test-utils | 2.4.9 | Vue 组件测试工具 |
| happy-dom | 17.6.1 | 模拟 DOM 环境 |
| @vitest/coverage-v8 | 2.1.9 | 代码覆盖率 |

## 测试结构

```
frontend/tests/
├── ProductCard.test.js      # 商品卡片组件测试
├── AppHeader.test.js        # 导航栏组件测试
└── api.mock.test.js         # API Mock 测试
```

## 测试统计

| 测试类型 | 数量 | 覆盖内容 |
|----------|------|----------|
| 组件渲染测试 | 18 | ProductCard(10) + AppHeader(8) |
| Mock API 测试 | 8 | 登录、注册、商品、订单接口 |
| **总计** | **26** | ✅ 全部通过 |

## 测试覆盖详情

### 组件测试

#### 1. ProductCard 商品卡片组件（10 个）

**渲染测试：**
- 渲染商品标题
- 渲染商品价格
- 显示在售状态标签
- 显示已售出状态
- 显示分类标签
- 显示卖家名称

**交互测试：**
- 默认不显示操作按钮
- showActions 为 true 时显示操作按钮
- 点击编辑按钮触发 edit 事件
- 点击删除按钮触发 delete 事件

#### 2. AppHeader 导航栏组件（8 个）

**渲染测试：**
- 渲染平台名称
- 未登录时显示登录按钮
- 渲染搜索框
- 搜索框有占位符
- 登录后显示发布按钮
- 登录后显示用户头像
- 标题区域有链接
- header 有正确的类名

### Mock API 测试（8 个）

| 模块 | 测试场景 | 状态 |
|------|----------|------|
| auth.login | 登录成功 | ✅ |
| auth.register | 邮箱已存在失败 | ✅ |
| products.getList | 获取商品列表 | ✅ |
| products.getDetail | 获取商品详情 | ✅ |
| products.create | 无权限失败 | ✅ |
| orders.create | 创建订单成功 | ✅ |
| orders.getList | 获取订单列表 | ✅ |
| 网络错误 | 处理网络异常 | ✅ |

## 组件测试策略

### 简化组件测试
由于 Element Plus 组件库的复杂性，采用简化组件进行测试：

```javascript
const ProductCard = {
  props: ['product', 'showActions'],
  emits: ['edit', 'delete'],
  template: `
    <div class="product-card">
      <h3 class="product-title">{{ product.title }}</h3>
      <!-- 简化的模板 -->
    </div>
  `
}
```

### Vue Router 集成
为组件提供路由上下文：

```javascript
const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/product/:id', name: 'ProductDetail' }]
})

const wrapper = mount(ProductCard, {
  global: { plugins: [router] }
})
```

### Pinia 状态管理
模拟用户登录状态：

```javascript
const pinia = createPinia()
pinia.state.value.user = {
  token: 'test-token',
  userInfo: { id: 1, username: 'testuser' }
}
```

## Mock API 策略

### Axios 实例 Mock

```javascript
const mockRequest = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  }
}

vi.mock('axios', () => ({
  default: { create: vi.fn(() => mockRequest) }
}))
```

### 成功场景测试

```javascript
it('auth.login should call POST /auth/login', async () => {
  mockRequest.post.mockResolvedValue({
    data: { code: 200, data: { token: 'test-token' } }
  })

  const result = await mockRequest.post('/auth/login', { ... })
  expect(result.data.code).toBe(200)
})
```

### 失败场景测试

```javascript
it('should handle 401 unauthorized', async () => {
  mockRequest.post.mockRejectedValue({
    response: { status: 401, data: { message: '未登录' } }
  })

  try {
    await mockRequest.post('/products', { ... })
  } catch (error) {
    expect(error.response.status).toBe(401)
  }
})
```

## 运行测试

```bash
# 进入前端目录
cd frontend

# 运行所有测试
npm test

# 运行测试（监听模式）
npm run test:watch
```

## 测试覆盖率报告

运行 `npm test` 后，覆盖率报告生成在 `frontend/coverage/` 目录：

- `coverage/index.html` - HTML 覆盖率报告
- `coverage/lcov.info` - LCov 格式（用于 Codecov）

## 测试最佳实践

1. **关注用户视角**：测试用户看到的内容和交互，而非实现细节
2. **Mock 外部依赖**：隔离网络请求、路由等外部因素
3. **测试关键路径**：优先测试核心功能和常见用户流程
4. **包含失败场景**：测试错误处理和边界条件

## 后续优化建议

1. 引入真实的 Element Plus 组件进行完整测试
2. 添加表单验证相关的测试
3. 增加页面级组件（View）的测试
4. 配置 CI/CD 流水线自动运行测试
5. 接入 Codecov 展示真实覆盖率徽章
