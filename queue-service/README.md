# 队列服务 (Queue Service)

这是一个基于 BullMQ 的队列服务，用于处理异步任务。服务使用 Koa 框架构建，提供 RESTful API 接口。

## 功能特点

- 支持多种任务类型的处理
- 提供任务状态查询
- 健康检查接口
- 队列监控和管理
- 与 Redis 集成，提供可靠的任务存储

## 技术栈

- Node.js
- Koa
- BullMQ
- Redis
- TypeScript

## 安装与配置

### 环境要求

- Node.js 16+
- Redis 6+

### 安装依赖

```bash
npm install
```

### 环境变量配置

创建 `.env` 文件，配置以下环境变量：

```
# 服务配置
PORT=3000

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 队列配置
QUEUE_PREFIX=deepmed
```

## 启动服务

### 开发环境

```bash
npm run dev
```

### 生产环境

```bash
npm run build
npm start
```

## API 接口

### 健康检查

```
GET /health
```

返回队列服务的健康状态，包括各个队列的状态和 Redis 连接状态。

### 添加任务

```
POST /tasks
```

请求体格式：

```json
{
  "type": "任务类型",
  "data": {
    // 任务数据
  }
}
```

支持的任务类型：
- `pdf-process`: PDF 处理任务
- `document-convert`: 文档转换任务
- `document-index`: 文档索引任务
- `system-task`: 系统任务

### 查询任务状态

```
GET /tasks/:jobId
```

返回指定任务的状态和结果。

## 队列类型

服务支持以下队列：

- `pdf-processing`: 处理 PDF 相关操作
- `document-convert`: 处理文档转换操作
- `document-index`: 处理文档索引操作
- `system-task`: 处理系统任务

## 与客户端集成

客户端可以通过 HTTP 请求与队列服务交互：

```typescript
// 添加任务
const response = await fetch('http://queue-service:3000/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'pdf-process',
    data: {
      documentId: '123',
      action: 'convert'
    }
  })
});

const { jobId } = await response.json();

// 查询任务状态
const statusResponse = await fetch(`http://queue-service:3000/tasks/${jobId}`);
const { state, result } = await statusResponse.json();
```

## 部署

### Docker 部署

1. 构建镜像：

```bash
docker build -t queue-service .
```

2. 运行容器：

```bash
docker run -d \
  --name queue-service \
  -p 3000:3000 \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  queue-service
```

### Docker Compose 部署

```yaml
version: '3'
services:
  queue-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
  
  redis:
    image: redis:6
    ports:
      - "6379:6379"
```

## 监控与维护

### 健康检查

定期访问 `/health` 端点检查服务状态。

### 日志

服务日志输出到标准输出，可以通过 Docker 日志或日志收集工具查看。

## 故障排除

### 常见问题

1. **Redis 连接失败**
   - 检查 Redis 服务是否运行
   - 验证 Redis 连接参数是否正确

2. **任务处理失败**
   - 检查任务处理器是否正确实现
   - 查看服务日志获取详细错误信息

## 贡献指南

1. Fork 仓库
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT 