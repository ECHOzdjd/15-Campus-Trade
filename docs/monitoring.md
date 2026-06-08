# 监控与日志说明

## 目标

本次监控模块用于补齐后端基础可观测性，方便在本地、Docker 和 CI 环境中判断服务是否可用、请求是否异常、接口耗时是否升高。

实现范围：

- 结构化 JSON 日志
- 健康检查接口
- 基础请求指标
- 监控使用说明和贡献记录

## 结构化日志

后端会为 HTTP 请求输出 JSON 日志。日志字段包括：

| 字段 | 说明 |
|------|------|
| `timestamp` | 日志产生时间，ISO 格式 |
| `level` | 日志级别 |
| `service` | 服务名，固定为 `campus-trade-backend` |
| `message` | 日志说明 |
| `event` | 事件类型，例如 `http_request` |
| `requestId` | 请求 ID，同时写入响应头 `X-Request-Id` |
| `method` | HTTP 方法 |
| `path` | 请求路径 |
| `statusCode` | 响应状态码 |
| `responseTimeMs` | 响应耗时，单位毫秒 |

示例：

```json
{
  "timestamp": "2026-06-02T10:00:00.000Z",
  "level": "info",
  "service": "campus-trade-backend",
  "message": "HTTP request completed",
  "event": "http_request",
  "requestId": "b0bcbf49-f2f1-4f61-8f98-1bdb5fdd0e57",
  "method": "GET",
  "path": "/health",
  "statusCode": 200,
  "responseTimeMs": 3.42
}
```

当统一错误处理中间件捕获到 500 及以上错误时，会输出 `request_error` 事件，包含请求路径、状态码和错误信息，便于排查后端异常。

日志级别可通过环境变量配置：

```powershell
$env:LOG_LEVEL = "info"
```

支持级别：`debug`、`info`、`warn`、`error`、`silent`。默认值为 `info`。

## 健康检查

健康检查接口：

- `GET /health`
- `GET /api/health`

响应示例：

```json
{
  "code": 200,
  "message": "OK",
  "data": {
    "status": "healthy",
    "timestamp": "2026-06-02T10:00:00.000Z",
    "version": "1.0.0",
    "uptimeSeconds": 12.35
  }
}
```

用途：

- Docker healthcheck 判断后端是否可用
- 本地开发时快速确认服务启动状态
- CI 或部署脚本中作为基础连通性检查

## 指标接口

指标接口：

- `GET /metrics`

当前为进程内存统计，服务重启后会重新计数。适合作业要求和本地调试，不作为长期持久化监控数据源。

响应字段：

| 字段 | 说明 |
|------|------|
| `startedAt` | 后端进程开始统计的时间 |
| `uptimeSeconds` | 当前进程运行秒数 |
| `totalRequests` | 已完成请求总数 |
| `totalErrors` | 状态码大于等于 400 的请求数 |
| `errorRate` | 错误请求占比 |
| `averageResponseTimeMs` | 平均响应耗时，单位毫秒 |
| `activeRequests` | 当前处理中请求数量 |
| `lastRequestAt` | 最近一次请求完成时间 |

响应示例：

```json
{
  "code": 200,
  "message": "OK",
  "data": {
    "startedAt": "2026-06-02T10:00:00.000Z",
    "uptimeSeconds": 30.12,
    "totalRequests": 42,
    "totalErrors": 3,
    "errorRate": 0.0714,
    "averageResponseTimeMs": 8.33,
    "activeRequests": 0,
    "lastRequestAt": "2026-06-02T10:00:30.000Z"
  }
}
```

## 可选扩展说明

作业要求中的错误追踪服务和告警配置为可选项，当前版本未接入外部 Sentry、Prometheus 或 Grafana。后续如果继续扩展，可以基于现有 JSON 日志和 `/metrics` 指标增加：

- 服务不可用告警：定时请求 `/health`，连续失败后告警。
- 错误率告警：读取 `/metrics` 中的 `errorRate`，超过阈值后告警。
- 慢请求告警：读取 `averageResponseTimeMs` 或分析结构化请求日志。
- 错误追踪：在统一错误处理中接入 Sentry，并记录 `requestId` 方便关联日志。

## 本地验证

启动后端后可使用 PowerShell 检查：

```powershell
Invoke-WebRequest http://localhost:3001/health
Invoke-WebRequest http://localhost:3001/api/health
Invoke-WebRequest http://localhost:3001/metrics
```

后端测试命令：

```powershell
cd backend
npx jest --runInBand --coverage=false --runTestsByPath src\test\integration\monitoring.test.js src\test\unit\errorHandler.test.js src\test\unit\logger.test.js
```
