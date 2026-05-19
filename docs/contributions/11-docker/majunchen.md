# Docker 部署贡献说明

姓名：马俊琛  
学号：2312190310  
日期：2026-05-13

## 我完成的工作

### 1. Dockerfile 编写

- [x] 前端 Dockerfile（多阶段构建）
- [ ] 后端 Dockerfile（多阶段构建）
- [x] 前端 `.dockerignore` 文件
- [x] 前端容器使用非 root 用户运行
- [x] 前端健康检查配置

### 2. Compose 配置

- [x] 开发环境 `compose.yaml`
- [x] 生产环境 `compose.prod.yaml`
- [x] 前端热重载配置
- [x] 前端生产环境健康检查配置
- [x] 前端生产环境资源限制配置

### 3. 自动化部署

选择了选项 A：构建并推送镜像到 GHCR。

具体内容：

- 参与新增 `.github/workflows/docker.yml`
- 前端镜像：`ghcr.io/${{ github.repository }}/frontend`
- 前端构建使用 `frontend/Dockerfile` 的 `production` target
- 推送分支：`main`、`develop`
- 构建前对前端镜像运行 Trivy 漏洞扫描
- 使用 GitHub Actions cache 加速前端 Docker 构建

## PR 链接

- PR #X: https://github.com/ECHOzdjd/15-Campus-Trade/pull/X

## 遇到的问题和解决

1. 问题：前端原来的 Dockerfile 只有构建阶段和普通 nginx 运行阶段，生产容器默认监听 80 端口，权限控制不够清晰。  
   解决：改为 `base`、`deps`、`dev`、`builder`、`production` 多阶段结构，生产阶段使用 `nginxinc/nginx-unprivileged:1.27-alpine`，容器内监听 8080，宿主机仍映射到 80。

2. 问题：开发环境需要前端热重载，如果直接使用生产 nginx 镜像，修改 Vue 代码后不能立即看到效果。  
   解决：在 `compose.yaml` 中让前端使用 Dockerfile 的 `dev` target，挂载 `./frontend:/app`，通过 Vite 监听 `0.0.0.0:5173`，同时映射到 `80` 和 `5173`。

3. 问题：前端接口地址在容器环境和浏览器环境中容易混淆。  
   解决：开发 Compose 中设置 `VITE_API_BASE_URL=http://localhost:3001/api`，让浏览器访问本机后端端口，保持和本地开发访问方式一致。

4. 问题：生产前端静态资源需要健康检查，方便 Compose 判断服务是否可用。  
   解决：在前端 Dockerfile 中增加 `HEALTHCHECK`，检查 `http://localhost:8080/` 是否可访问。

5. 问题：前端构建上下文中包含 `node_modules`、`dist`、`coverage` 等无关文件，会增加构建体积和构建时间。  
   解决：新增 `frontend/.dockerignore`，排除依赖目录、构建产物、覆盖率报告、环境变量文件和日志文件。

## AI 使用情况

- 使用了前端 Vue/Vite Dockerfile 多阶段构建、Nginx 非 root 镜像、Docker Compose 热重载、GHCR 自动构建相关 Prompt。
- AI 帮助梳理了前端开发环境和生产环境的差异，补齐了热重载、静态资源服务、健康检查、镜像扫描等部署要求。

## 心得体会

这次 Docker 部署让我更清楚地理解了前端项目在开发和生产两个阶段的差异。开发阶段需要 Vite 热重载来提高调试效率，生产阶段需要把静态资源构建出来并交给 Nginx 提供服务。通过多阶段 Dockerfile，可以把依赖安装、构建和运行拆开，减少最终镜像中的无关内容。通过 Compose 和 GitHub Actions 配合，前端构建、镜像扫描和镜像推送也可以形成固定流程，减少手动部署时的遗漏。
