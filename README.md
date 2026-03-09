# 校园二手交易平台（Campus Trade）

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 项目简介

**校园二手交易平台**是一款面向在校大学生的移动端响应式 Web 应用，旨在解决校园内闲置物品流通问题。用户可以发布二手书籍、电子产品、生活用品等闲置商品，也可以浏览、搜索并联系卖家完成交易。平台支持商品分类浏览、关键词搜索、收藏夹、即时消息通知等功能，帮助同学们以更低成本获取所需物品，同时减少校园资源浪费。

> 目标用户：全体在校大学生，尤其适合毕业季物品转让和开学季二手教材交易场景。

---

## 团队成员

| 姓名   | 学号       | GitHub 用户名 | 分工     | 文档 |
|--------|------------|---------------|----------|------|
| 马俊琛 | 2312190310 | -             | 前端开发 | -    |
| 王勇   | 2312190301 | ywang         | 后端开发 | [后端说明](docs/backend.md) · [API 文档](docs/api.md) |

---

## 项目结构

```
campus-trade/
├── README.md               # 项目整体说明（本文件）
├── .gitignore              # Git 忽略规则
├── docs/
│   ├── backend.md          # 后端模块说明（王勇）
│   └── api.md              # API 接口设计（王勇）
└── backend/                # 后端代码目录
    ├── src/
    │   ├── app.js
    │   ├── server.js
    │   ├── config/
    │   ├── routes/
    │   ├── controllers/
    │   ├── services/
    │   ├── models/
    │   ├── middlewares/
    │   └── utils/
    ├── sql/
    ├── .env.example
    └── package.json
```

---

## 技术栈

### 前端
| 技术 | 说明 |
|------|------|
| Vue 3 + Vite | 核心框架与构建工具 |
| Vant | 移动端 UI 组件库 |
| Pinia | 状态管理 |
| Axios | HTTP 请求 |
| CSS Flexbox / Grid | 响应式布局 |

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
