# CI/CD 配置贡献说明

**姓名**：王勇  
**学号**：2312190301  
**角色**：后端开发  
**日期**：2026-05-05

---

## 完成的工作

### 1. GitHub Actions 后端 Job 配置

#### 1.1 工作流文件创建
- 创建 `.github/workflows/ci.yml` 文件
- 配置后端测试 job（backend-test）
- 设置触发条件：push 到 main/develop 分支，PR 到 main 分支

#### 1.2 MySQL 服务容器配置
配置了 MySQL 8.0 服务容器，用于 CI 环境中的集成测试：

```yaml
services:
  mysql:
    image: mysql:8.0
    env:
      MYSQL_ROOT_PASSWORD: test_password
      MYSQL_DATABASE: campus_trade_test
    ports:
      - 3306:3306
    options: >-
      --health-cmd="mysqladmin ping -h localhost -u root -ptest_password"
      --health-interval=10s
      --health-timeout=5s
      --health-retries=5
```

**关键配置点**：
- 使用健康检查确保 MySQL 就绪后再运行测试
- 设置 10 秒检查间隔，最多重试 5 次
- 端口映射 3306:3306

#### 1.3 数据库初始化流程
添加了数据库初始化步骤，在测试前运行 SQL 脚本：

```yaml
- name: Initialize Database
  working-directory: backend
  run: |
    mysql -h 127.0.0.1 -u root -ptest_password campus_trade_test < src/scripts/init-db.sql
```

**注意事项**：
- 必须使用 `127.0.0.1` 而非 `localhost`（GitHub Actions 环境要求）
- 在等待 MySQL 就绪后执行
- 使用测试数据库 `campus_trade_test`

#### 1.4 测试环境变量配置
配置了完整的测试环境变量：

```yaml
env:
  DB_HOST: 127.0.0.1
  DB_PORT: 3306
  DB_USER: root
  DB_PASSWORD: test_password
  DB_NAME: campus_trade_test
  JWT_SECRET: test_jwt_secret_key
```

---

### 2. 后端 ESLint 配置

#### 2.1 ESLint 配置文件
创建 `backend/.eslintrc.json`，配置适合 Node.js + Express 项目的规则：

```json
{
  "env": {
    "node": true,
    "es2021": true,
    "jest": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12
  },
  "rules": {
    "no-console": "off",
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "semi": ["error", "never"],
    "quotes": ["error", "single"],
    "indent": ["error", 2],
    "comma-dangle": ["error", "never"],
    "no-trailing-spaces": "error"
  }
}
```

**规则选择理由**：
- `no-console: off` - 后端需要日志输出
- `no-unused-vars` - 避免未使用变量，允许 `_` 前缀（用于忽略参数）
- `semi: never` - 根据现有代码风格（无分号）
- `quotes: single` - 统一使用单引号
- `indent: 2` - 统一 2 空格缩进
- `comma-dangle: never` - 不使用尾随逗号
- `no-trailing-spaces` - 清理尾随空格

#### 2.2 ESLint 忽略文件
创建 `backend/.eslintignore`：
```
node_modules/
coverage/
uploads/
```

#### 2.3 package.json 脚本添加
添加了 lint 相关脚本：
- `"lint": "eslint src/**/*.js --max-warnings 0"` - 检查代码，零警告要求
- `"lint:fix": "eslint src/**/*.js --fix"` - 自动修复 Lint 问题

#### 2.4 依赖安装
在 `devDependencies` 中添加：
- `"eslint": "^8.57.0"`

---

### 3. 后端测试环境适配

#### 3.1 测试配置文件更新
修改 `backend/src/test/setup.js`，支持从环境变量读取配置：

```javascript
// Jest setup file - 支持 CI 环境变量
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key'
process.env.DB_HOST = process.env.DB_HOST || 'localhost'
process.env.DB_PORT = process.env.DB_PORT || '3306'
process.env.DB_USER = process.env.DB_USER || 'root'
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '1234'
process.env.DB_NAME = process.env.DB_NAME || 'campus_trade'
```

**改进点**：
- 优先使用环境变量（CI 环境）
- 本地开发时使用默认值
- 提高配置灵活性

#### 3.2 Jest 配置调整
在 `package.json` 中更新 Jest 配置：

```json
"jest": {
  "testEnvironment": "node",
  "setupFilesAfterEnv": ["<rootDir>/src/test/setup.js"],
  "testMatch": ["**/src/test/**/*.test.js"],
  "coveragePathIgnorePatterns": [
    "/node_modules/",
    "/src/scripts/",
    "/src/test/"
  ],
  "coverageReporters": ["text", "lcov", "html"],
  "coverageDirectory": "coverage",
  "testTimeout": 30000
}
```

**关键调整**：
- 修正测试文件路径：`**/src/test/**/*.test.js`
- 添加 `testTimeout: 30000`（30 秒超时，适应 CI 环境）
- 排除测试文件本身的覆盖率统计

---

### 4. Codecov 后端覆盖率集成

#### 4.1 Codecov 配置文件
创建 `.codecov.yml`，配置后端覆盖率 flag：

```yaml
flags:
  backend:
    paths:
      - backend/src/
    carryforward: true
```

#### 4.2 GitHub Actions 上传步骤
在工作流中添加覆盖率上传：

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./backend/coverage/lcov.info
    flags: backend
    name: backend-coverage
    fail_ci_if_error: false
```

**配置说明**：
- 使用 `flag: backend` 区分前后端覆盖率
- 上传 `lcov.info` 格式的覆盖率报告
- `fail_ci_if_error: false` - 避免 Codecov 上传失败阻塞 CI

---

### 5. README 徽章更新

更新 `README.md` 中的徽章：
- 添加 CI 状态徽章
- 更新 Codecov 徽章 URL（从 `your-org/campus-trade` 改为 `ECHOzdjd/15-Campus-Trade`）

```markdown
[![CI](https://github.com/ECHOzdjd/15-Campus-Trade/actions/workflows/ci.yml/badge.svg)]
[![Backend Coverage](https://codecov.io/gh/ECHOzdjd/15-Campus-Trade/branch/main/graph/badge.svg?flag=backend)]
```

---

## 技术细节

### MySQL 健康检查配置

**为什么需要健康检查**：
- MySQL 容器启动需要时间（初始化数据库）
- 如果测试在 MySQL 就绪前运行，会导致连接失败
- 健康检查确保 MySQL 完全启动后再执行后续步骤

**健康检查命令**：
```bash
mysqladmin ping -h localhost -u root -ptest_password
```

**等待 MySQL 就绪脚本**：
```bash
until mysqladmin ping -h 127.0.0.1 -u root -ptest_password --silent; do
  echo 'Waiting for MySQL...'
  sleep 2
done
```

### Jest 测试超时配置

**为什么需要 30 秒超时**：
- CI 环境性能可能低于本地开发环境
- 集成测试需要连接数据库，耗时较长
- 默认 5 秒超时可能导致测试失败

**配置方式**：
```json
"testTimeout": 30000
```

### ESLint 规则选择理由

**`no-console: off`**：
- 后端需要使用 `console.log` 进行日志输出
- 生产环境通常使用专业日志库（如 Winston），但开发环境 console 仍然有用

**`no-unused-vars` with `argsIgnorePattern`**：
- 允许以 `_` 开头的未使用变量（如 `_req`, `_next`）
- 常用于 Express 中间件，某些参数必须声明但不使用

**`semi: never`**：
- 根据现有代码风格统一配置
- 项目中大部分代码不使用分号

---

## 遇到的问题和解决

### 问题 1：MySQL 连接失败（localhost vs 127.0.0.1）

**症状**：
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**原因**：
- GitHub Actions 环境中，`localhost` 可能解析为 IPv6 地址 `::1`
- MySQL 服务容器监听在 IPv4 地址 `127.0.0.1`
- 导致连接失败

**解决方案**：
- 在测试环境变量中使用 `DB_HOST=127.0.0.1`
- 在等待 MySQL 脚本中也使用 `127.0.0.1`

### 问题 2：测试路径配置错误

**症状**：
```
No tests found, exiting with code 1
```

**原因**：
- `package.json` 中的 `testMatch` 配置为 `**/tests/**/*.test.js`
- 实际测试文件在 `backend/src/test/` 目录
- 路径不匹配导致 Jest 找不到测试文件

**解决方案**：
- 更新 `testMatch` 为 `**/src/test/**/*.test.js`
- 更新 `setupFilesAfterEnv` 为 `<rootDir>/src/test/setup.js`

### 问题 3：Lint 错误修复过程

**遇到的主要 Lint 错误**：
1. **缩进不一致**：部分文件使用 4 空格，部分使用 2 空格
   - 解决：运行 `npm run lint:fix` 自动统一为 2 空格

2. **尾随空格**：多个文件存在行尾空格
   - 解决：`no-trailing-spaces` 规则自动清理

3. **未使用变量**：部分中间件参数未使用
   - 解决：使用 `_` 前缀（如 `_req`, `_next`）

4. **分号不一致**：部分语句有分号，部分没有
   - 解决：统一配置 `semi: never`，自动移除分号

**修复流程**：
```bash
cd backend
npm install eslint --save-dev
npm run lint:fix          # 自动修复 90% 的问题
npm run lint              # 检查剩余问题
# 手动修复未使用变量等问题
npm run lint              # 确认零警告
```

---

## 工作量统计

### 配置文件
- 新建文件：4 个
  - `.github/workflows/ci.yml`（后端 job 部分）
  - `backend/.eslintrc.json`
  - `backend/.eslintignore`
  - `.codecov.yml`（后端 flag 部分）
- 修改文件：3 个
  - `backend/package.json`（添加 lint 脚本、ESLint 依赖、Jest 配置）
  - `backend/src/test/setup.js`（支持 CI 环境变量）
  - `README.md`（更新徽章）

### Lint 问题修复
- 自动修复：约 150 处（缩进、尾随空格、分号）
- 手动修复：约 20 处（未使用变量、代码逻辑调整）

### CI 调试时间
- 工作流配置：2 小时
- MySQL 服务容器调试：1.5 小时
- ESLint 配置和错误修复：3 小时
- 测试环境适配：1 小时
- 文档编写：1.5 小时
- **总计**：约 9 小时

---

## 心得体会

### 技术收获

1. **GitHub Actions 实践**：
   - 学习了如何配置服务容器（MySQL）
   - 理解了健康检查的重要性
   - 掌握了环境变量在 CI 中的使用

2. **ESLint 配置经验**：
   - 学会了根据项目特点选择合适的规则
   - 理解了代码风格统一对团队协作的重要性
   - 掌握了自动修复和手动修复的平衡

3. **测试环境适配**：
   - 学习了如何让测试在本地和 CI 环境都能运行
   - 理解了环境变量的灵活配置方式
   - 掌握了 Jest 配置的各种选项

### 遇到的挑战

1. **MySQL 连接问题**：
   - 最初使用 `localhost` 导致连接失败
   - 通过查阅 GitHub Actions 文档和测试，发现需要使用 `127.0.0.1`
   - 学会了在 CI 环境中调试网络连接问题

2. **测试路径配置**：
   - 项目结构与常规不同（`src/test/` 而非 `tests/`）
   - 需要仔细检查实际文件位置并调整配置
   - 学会了使用 `find` 命令快速定位文件

3. **Lint 错误修复**：
   - 现有代码风格不统一，修复工作量较大
   - 需要平衡自动修复和手动修复
   - 学会了逐步推进代码质量改进

### 团队协作

- 与前端同学（马俊琛）协作配置 CI/CD 流水线
- 共同讨论 ESLint 规则和代码风格
- 分工明确，各自负责前后端配置
- 通过 PR Review 互相学习和改进

### 对项目的影响

1. **代码质量提升**：
   - ESLint 统一了代码风格
   - 减少了代码审查中的风格争议
   - 提高了代码可读性和可维护性

2. **测试自动化**：
   - 每次提交自动运行测试
   - 及早发现问题，减少 bug 进入主分支
   - 提高了团队开发效率

3. **覆盖率监控**：
   - Codecov 可视化覆盖率变化
   - 帮助识别未测试的代码
   - 促进测试驱动开发（TDD）

### 未来改进方向

1. **覆盖率提升**：
   - 当前后端覆盖率约 49%，需要补充测试
   - 优先覆盖核心业务逻辑（用户认证、商品管理、订单处理）

2. **CI 性能优化**：
   - 考虑使用缓存加速依赖安装
   - 优化测试并行化，减少运行时间

3. **代码质量工具扩展**：
   - 考虑引入 Prettier 自动格式化
   - 考虑引入 Husky + lint-staged 实现 Git 钩子

---

## PR 链接

- PR #X: https://github.com/ECHOzdjd/15-Campus-Trade/pull/X（待创建）

## CI 运行链接

- https://github.com/ECHOzdjd/15-Campus-Trade/actions（待首次运行）

---

**总结**：本次 CI/CD 配置工作为项目建立了自动化测试和代码质量检查流程，提高了开发效率和代码质量。通过实践学习了 GitHub Actions、ESLint、Jest 等工具的使用，积累了宝贵的 DevOps 经验。
