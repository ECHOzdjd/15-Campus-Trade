# 校园二手交易平台（Campus Trade）

[![CI](https://github.com/ECHOzdjd/15-Campus-Trade/actions/workflows/ci.yml/badge.svg)](https://github.com/ECHOzdjd/15-Campus-Trade/actions/workflows/ci.yml)
[![Backend Coverage](https://codecov.io/gh/ECHOzdjd/15-Campus-Trade/branch/main/graph/badge.svg?flag=backend)](https://codecov.io/gh/ECHOzdjd/15-Campus-Trade?flag=backend)
[![Frontend Coverage](https://codecov.io/gh/ECHOzdjd/15-Campus-Trade/branch/main/graph/badge.svg?flag=frontend)](https://codecov.io/gh/ECHOzdjd/15-Campus-Trade?flag=frontend)

## 测试覆盖率

| 模块 | 测试数量 | 覆盖率 |
|------|---------|--------|
| 后端 | 32 个测试 (单元测试 20 + API 测试 12) | ~49% |
| 前端 | 26 个测试 (组件测试 18 + Mock API 测试 8) | 组件覆盖 |

## 团队成员

| 姓名   | 学号       | 主要职责 | 阶段贡献 |
|--------|------------|----------|---------|
| 马俊琛 | 2312190310 | 前端开发 | UI 设计（02）、前端架构设计（03） |
| 王勇   | 2312190301 | 后端开发 | UI 设计（02）、后端架构设计（03）、数据库设计（03） |

> 详细贡献说明见 `docs/contributions/` 目录。

## 项目简介

**校园二手交易平台**是一款面向在校大学生的移动端响应式 Web 应用，旨在解决校园内闲置物品流通问题。用户可以发布二手书籍、电子产品、生活用品等闲置商品，也可以浏览、搜索并联系卖家完成交易。平台支持商品分类浏览、关键词搜索、收藏夹、即时消息通知等功能，帮助同学们以更低成本获取所需物品，同时减少校园资源浪费。

> 目标用户：全体在校大学生，尤其适合毕业季物品转让和开学季二手教材交易场景。

---

## 技术栈

### 前端
| 技术 | 说明 |
|------|------|
| Vue 3 + Vite 5 | 核心框架与构建工具 |
| Element Plus 2 | UI 组件库 |
| Vue Router 4 | 路由管理 |
| Pinia 2 | 状态管理 |
| Axios 1 | HTTP 请求封装 |

### 后端
| 技术 | 说明 |
|------|------|
| Node.js v18 | 运行环境 |
| Express.js v4 | Web 框架 |
| JWT | 身份认证 |
| Multer | 文件上传 |
| RESTful API | 接口设计风格 |

### 数据库
| 技术 | 说明 |
|------|------|
| MySQL 8.0 | 主数据库（用户、商品、订单） |
| Redis | 缓存层（热门商品、会话缓存） |
| 本地存储 / 阿里云 OSS | 商品图片存储 |

## Figma 设计文件

🔗 [查看 Figma 设计](https://www.figma.com/make/xtuyI7R9oN4QiYfIoDJn4c/%E6%A0%A1%E5%9B%AD%E4%BA%8C%E6%89%8B%E4%BA%A4%E6%98%93%E5%B9%B3%E5%8F%B0?fullscreen=1&t=fCvGGPlqFoL84oYq-1&preview-route=%2Fproduct%2Fedit%2F1)