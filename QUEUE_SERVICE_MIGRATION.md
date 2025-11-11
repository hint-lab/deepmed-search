# 队列服务架构指南

## 概述

本项目的队列服务采用了分层架构，Server Actions 直接调用队列管理器，而 HTTP API 端点供客户端组件和外部服务使用。

## 架构设计

### 当前架构

```
┌─────────────────────────────────────────────────────┐
│  前端组件 (客户端)                                    │
└─────────┬───────────────────────────┬───────────────┘
          │                           │
          │ Server Action             │ HTTP API
          │                           │
          ▼                           ▼
┌─────────────────────┐    ┌──────────────────────┐
│  Server Actions     │    │  API Routes          │
│  (服务器端)           │    │  /api/queue/*        │
│  src/actions/*.ts   │    │                      │
└─────────┬───────────┘    └─────────┬────────────┘
          │                           │
          │ 直接调用                   │ 直接调用
          │                           │
          ▼                           ▼
┌─────────────────────────────────────────────────────┐
│         queue-manager (队列管理器)                   │
│         src/lib/bullmq/queue-manager.ts             │
└─────────┬───────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│         BullMQ + Redis                              │
└─────────────────────────────────────────────────────┘
```

### 架构说明

1. **Server Actions**（`src/actions/*.ts`）
   - ✅ **直接调用** `queue-manager` 函数
   - 已经在服务器端运行，无需 HTTP 调用
   - 例如：`research.ts`, `queue.ts`

2. **API Routes**（`src/app/api/queue/*`）
   - ✅ 提供 **HTTP 接口**
   - 供客户端组件使用
   - 供外部服务调用（如果将来独立部署队列服务）

3. **Queue Client**（`src/lib/queue-client.ts`）
   - 仅用于客户端组件
   - 通过 HTTP API 与队列服务通信

## 环境变量配置

需要在 `.env` 文件中添加以下环境变量：

```bash
# 队列服务 API 地址
# 开发环境：指向本地 Next.js 应用
NEXT_PUBLIC_QUEUE_API_URL=http://localhost:3000

# 生产环境：指向实际的队列服务地址
# NEXT_PUBLIC_QUEUE_API_URL=http://queue-service:3000
# 或使用外部域名
# NEXT_PUBLIC_QUEUE_API_URL=https://queue.yourdomain.com
```

### 说明

- **开发环境**：队列 API 端点和 Next.js 应用在同一进程中，使用 `http://localhost:3000`
- **生产环境**：
  - 如果使用 Docker Compose，可以使用服务名称如 `http://app:3000`
  - 如果队列服务独立部署，使用实际的服务地址

## API 端点

队列服务提供以下 HTTP API 端点：

### 1. 添加任务到队列
```
POST /api/queue/add-task
Content-Type: application/json

{
  "taskType": "DEEP_RESEARCH" | "DOCUMENT_CONVERT_TO_MD" | "CHUNK_VECTOR_INDEX",
  "payload": {
    // 任务特定的数据
  }
}

Response:
{
  "success": true,
  "data": {
    "jobId": "job-id-here",
    "taskType": "DEEP_RESEARCH",
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

### 2. 查询任务状态
```
GET /api/queue/job-status?jobId=<job-id>

Response:
{
  "success": true,
  "data": {
    "state": "completed" | "active" | "waiting" | "failed",
    "progress": 50,
    "result": { /* 任务结果 */ },
    "error": null
  }
}
```

### 3. 健康检查
```
GET /api/queue/health

Response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "redis": {
      "connected": true
    },
    "queues": {
      "deep-research": {
        "status": "healthy",
        "details": { /* 队列统计信息 */ }
      }
    }
  }
}
```

## 代码变更

### 已迁移的文件

1. **`src/actions/research.ts`**
   - ✅ 使用 `addTaskViaAPI()` 替代 `addTask()`
   - ✅ 通过 HTTP API 提交 Deep Research 任务

2. **`src/actions/queue.ts`**
   - ✅ `checkQueueHealthAction()` 使用 `checkQueueHealthViaAPI()`
   - ✅ `addTaskAction()` 使用 `addTaskViaAPI()`
   - ✅ `getTaskStatusAction()` 使用 `getJobStatusViaAPI()`

### 队列客户端

所有 HTTP API 调用都通过 `src/lib/queue-client.ts` 进行：

```typescript
import { addTaskViaAPI, getJobStatusViaAPI, checkQueueHealthViaAPI } from '@/lib/queue-client';
import { TaskType } from '@/lib/bullmq/types';

// 添加任务
const result = await addTaskViaAPI(TaskType.DEEP_RESEARCH, {
  taskId: 'task-123',
  question: 'Research question',
  tokenBudget: 2000000
});

// 查询状态
const status = await getJobStatusViaAPI('job-id');

// 健康检查
const health = await checkQueueHealthViaAPI();
```

## 部署配置

### Docker Compose

```yaml
services:
  # Next.js 主应用
  app:
    environment:
      NEXT_PUBLIC_QUEUE_API_URL: http://app:3000  # 使用容器服务名
      
  # 队列 Worker（独立处理队列任务）
  queue-worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    depends_on:
      - redis
      - postgres
    environment:
      REDIS_URL: redis://redis:6379
      DATABASE_URL: ${DATABASE_URL}
```

### 独立队列服务部署

如果将队列服务独立部署（推荐用于生产环境）：

1. 部署队列服务（包含 API 端点和 Worker）
2. 配置 Next.js 应用的 `NEXT_PUBLIC_QUEUE_API_URL` 指向队列服务
3. 确保网络连通性和认证配置

## 任务类型

支持的任务类型（定义在 `src/lib/bullmq/types.ts`）：

```typescript
export enum TaskType {
  DOCUMENT_CONVERT_TO_MD = 'DOCUMENT_CONVERT_TO_MD',  // 文档转换为 Markdown
  CHUNK_VECTOR_INDEX = 'CHUNK_VECTOR_INDEX',          // 文档分块和向量索引
  DEEP_RESEARCH = 'DEEP_RESEARCH',                    // 深度研究任务
}
```

## 错误处理

所有 HTTP API 调用都包含错误处理：

```typescript
const result = await addTaskViaAPI(taskType, payload);

if (!result.success) {
  console.error('添加任务失败:', result.error);
  // 处理错误
  return {
    success: false,
    error: result.error
  };
}

// 成功处理
const jobId = result.data?.jobId;
```

## 监控和调试

### 查看队列状态

```bash
# 健康检查
curl http://localhost:3000/api/queue/health

# 查询任务状态
curl http://localhost:3000/api/queue/job-status?jobId=<job-id>
```

### 日志

- **队列 Worker 日志**：`docker logs deepmed-queue-worker`
- **API 端点日志**：查看 Next.js 应用日志

## 性能优化建议

1. **Redis 连接池**：确保 Redis 连接配置合理
2. **Worker 并发**：通过 `BULLMQ_CONCURRENCY` 环境变量调整
3. **任务超时**：根据任务类型设置合理的超时时间
4. **错误重试**：配置任务失败重试策略（已在 `queue-manager.ts` 中配置）

## 迁移检查清单

- [x] 修改 `src/actions/research.ts` 使用 HTTP API
- [x] 修改 `src/actions/queue.ts` 使用 HTTP API
- [x] 确认 API 端点正常工作
- [ ] 配置生产环境的 `NEXT_PUBLIC_QUEUE_API_URL`
- [ ] 测试 Deep Research 功能
- [ ] 测试文档处理功能
- [ ] 监控队列性能

## 常见问题

### Q: 为什么要使用 HTTP API 而不是直接调用函数？

A: 
- **解耦**：队列服务可以独立部署和扩展
- **可靠性**：更容易实现负载均衡和故障转移
- **监控**：统一的 API 端点便于监控和调试
- **安全性**：可以在 API 层添加认证和授权

### Q: 如何处理 HTTP API 调用失败？

A: 队列客户端 (`queue-client.ts`) 已包含错误处理逻辑：
- 网络错误会被捕获并返回友好的错误信息
- HTTP 错误状态码会被解析并返回
- 所有错误都会被记录到控制台

### Q: 开发环境下如何测试？

A: 
1. 确保 Redis 正在运行
2. 启动 Next.js 应用：`npm run dev`
3. 启动队列 Worker（可选）：`npm run worker:dev`
4. 使用 Deep Research 功能测试

## 相关文件

- `src/lib/queue-client.ts` - HTTP API 客户端
- `src/app/api/queue/*/route.ts` - API 端点实现
- `src/lib/bullmq/queue-manager.ts` - 队列管理器
- `src/worker/index.ts` - Worker 入口
- `Dockerfile.worker` - Worker Docker 配置

## 更新日期

2025-01-11

