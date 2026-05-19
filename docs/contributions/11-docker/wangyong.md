# Docker 部署贡献说明

姓名：王勇  
学号：2312190301 
日期：2026-05-13

## 我完成的工作

### 1. Dockerfile 编写

- [x] 前端 Dockerfile（多阶段构建）
- [x] 后端 Dockerfile（多阶段构建）
- [x] `.dockerignore` 文件
- [x] 容器使用非 root 用户运行
- [x] 配置健康检查

### 2. Compose 配置

- [x] 开发环境 `compose.yaml`
- [x] 生产环境 `compose.prod.yaml`
- [x] MySQL 健康检查配置
- [x] 前端、后端健康检查配置
- [x] 数据库数据持久化配置
- [x] 生产密钥通过 Docker secrets 管理

### 3. 自动化部署

选择了选项 A：构建并推送镜像到 GHCR。

具体内容：

- 新增 `.github/workflows/docker.yml`
- 后端镜像：`ghcr.io/${{ github.repository }}/backend`
- 前端镜像：`ghcr.io/${{ github.repository }}/frontend`
- 推送分支：`main`、`develop`
- 每次构建前运行 Trivy 镜像漏洞扫描
- 使用 GitHub Actions cache 加速 Docker 构建

## PR 链接

- PR #X: https://github.com/ECHOzdjd/15-Campus-Trade/pull/X

## 遇到的问题和解决

1. 问题：原来的后端 Dockerfile 只有单阶段构建，并且默认 root 用户运行。  
   解决：改为 `base`、`deps`、`dev`、`production` 多阶段结构，生产阶段只安装运行依赖，并切换到 `node` 用户。

2. 问题：原来的前端生产镜像使用普通 nginx，默认监听 80 端口并以 root 相关配置运行。  
   解决：改为 `nginxinc/nginx-unprivileged:1.27-alpine`，容器内监听 8080，宿主机仍映射到 80。

3. 问题：生产环境密码如果直接写在 Compose 中，会造成配置泄露风险。  
   解决：在 `compose.prod.yaml` 中使用 Docker secrets，真实密钥文件放在 `secrets/*.txt`，并通过 `.gitignore` 排除。

4. 问题：作业要求健康检查端点 `/health`，项目原来只有 `/api/health`。  
   解决：保留 `/api/health`，同时新增 `/health` 别名供 Docker 健康检查使用。

## AI 使用情况

- 使用了 Dockerfile 多阶段构建、Docker Compose V2、GHCR 自动化构建相关 Prompt。
- AI 帮助梳理了开发环境和生产环境的差异，补齐了非 root 运行、健康检查、密钥管理、镜像扫描等部署要求。

## 心得体会

这次 Docker 部署让我更清楚地区分了开发环境和生产环境的配置方式。开发环境更关注热重载和调试效率，生产环境更关注镜像体积、权限控制、健康检查和密钥管理。通过 Compose 和 GitHub Actions 配合，可以把本地启动、镜像构建、漏洞扫描和镜像推送串成稳定流程，减少手动部署时的遗漏。
