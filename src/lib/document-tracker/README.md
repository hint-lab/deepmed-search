# 文档处理进度跟踪器

使用 Redis 发布订阅机制实时推送文档处理进度到前端。

## 架构

```
┌─────────────┐     Redis Pub/Sub      ┌──────────────┐
│   Backend   │ ─────────────────────> │    Redis     │
│  (Worker)   │   发布进度事件           │              │
└─────────────┘                        └──────────────┘
                                               │
                                               │ SSE
                                               ↓
                                        ┌──────────────┐
                                        │   Frontend   │
                                        │ (EventSource)│
                                        └──────────────┘
```

## 功能特性

- ✅ 实时进度更新（无需轮询）
- ✅ 支持多种事件类型（进度/状态/错误/完成）
- ✅ 使用 Redis Pub/Sub 实现
- ✅ SSE (Server-Sent Events) API
- ✅ 自动资源清理

## 使用方法

### 后端：发布进度

```typescript
import {
  updateDocumentProgress,
  updateDocumentStatus,
  reportDocumentError,
  reportDocumentComplete
} from '@/lib/document-tracker';

// 1. 更新进度
await updateDocumentProgress(
  documentId,
  50,  // 进度百分比
  '正在清理文本...'  // 进度消息
);

// 2. 更新状态
await updateDocumentStatus(
  documentId,
  'CONVERTING',
  '开始转换文档'
);

// 3. 报告错误
await reportDocumentError(
  documentId,
  '文档处理失败'
);

// 4. 报告完成
await reportDocumentComplete(
  documentId,
  {
    chunksCount: 10,
    totalTokens: 5000
  }
);
```

### 前端：订阅进度

#### 方式1：使用 EventSource

```typescript
// 创建 SSE 连接
const eventSource = new EventSource(
  `/api/document/progress/${documentId}`
);

// 监听不同类型的事件
eventSource.addEventListener('progress', (event) => {
  const data = JSON.parse(event.data);
  console.log(`进度: ${data.progress}% - ${data.progressMsg}`);
});

eventSource.addEventListener('status', (event) => {
  const data = JSON.parse(event.data);
  console.log(`状态: ${data.status}`);
});

eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  console.error(`错误: ${data.error}`);
  eventSource.close();
});

eventSource.addEventListener('complete', (event) => {
  const data = JSON.parse(event.data);
  console.log('处理完成:', data.metadata);
  eventSource.close();
});

// 连接错误处理
eventSource.onerror = (error) => {
  console.error('SSE 连接错误:', error);
  event Source.close();
};

// 清理
onUnmount(() => {
  eventSource.close();
});
```

#### 方式2：使用 React Hook (推荐)

```typescript
import { useDocumentProgress } from '@/hooks/use-document-progress';

function DocumentProcessing({ documentId }: { documentId: string }) {
  const { progress, status, error, isComplete } = useDocumentProgress(documentId);

  if (error) {
    return <div>错误: {error}</div>;
  }

  if (isComplete) {
    return <div>处理完成!</div>;
  }

  return (
    <div>
      <div>状态: {status}</div>
      <ProgressBar value={progress} />
    </div>
  );
}
```

## 事件类型

### 1. Progress Event (进度更新)
```json
{
  "type": "progress",
  "progress": 50,
  "progressMsg": "正在清理文本...",
  "timestamp": 1699999999999
}
```

### 2. Status Event (状态更新)
```json
{
  "type": "status",
  "status": "CONVERTING",
  "progressMsg": "开始转换文档",
  "timestamp": 1699999999999
}
```

### 3. Error Event (错误)
```json
{
  "type": "error",
  "error": "文档处理失败",
  "timestamp": 1699999999999
}
```

### 4. Complete Event (完成)
```json
{
  "type": "complete",
  "metadata": {
    "chunksCount": 10,
    "totalTokens": 5000
  },
  "timestamp": 1699999999999
}
```

## API 端点

### GET `/api/document/progress/[documentId]`

订阅文档处理进度的 SSE 端点。

**响应头:**
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

**事件流:**
- 每30秒发送一次心跳 (`: heartbeat`)
- 收到进度更新时立即推送
- 处理完成或错误后自动关闭连接

## 进度推送时机

文档处理流程中的关键步骤都会推送进度：

1. **开始转换** → `updateDocumentStatus('CONVERTING', '开始转换文档')`
2. **开始清理** → `updateDocumentProgress(50, '正在清理文本...')`
3. **清理完成** → `updateDocumentProgress(55, '文本清理完成')`
4. **上传MinIO** → `updateDocumentProgress(58, '内容已上传')`
5. **开始分块** → `updateDocumentProgress(65, '开始文档分块...')`
6. **处理完成** → `reportDocumentComplete({ chunksCount, totalTokens })`

## 降级策略

如果 SSE 连接失败，前端应降级到轮询：

```typescript
// 尝试 SSE
let eventSource: EventSource | null = null;
let pollInterval: NodeJS.Timeout | null = null;

try {
  eventSource = new EventSource(`/api/document/progress/${documentId}`);
  // ... 设置监听器
} catch (error) {
  // 降级到轮询（每5秒一次）
  pollInterval = setInterval(async () => {
    const status = await fetch(`/api/document/status/${documentId}`);
    // ... 处理状态
  }, 5000);
}
```

## 性能考虑

- Redis Pub/Sub 延迟通常 < 10ms
- SSE 连接保持开启，无轮询开销
- 每个文档使用独立频道，避免串扰
- 连接关闭时自动清理 Redis 订阅

## 故障排查

### 1. 前端收不到进度更新

**检查:**
- Redis 是否正常运行
- SSE 连接是否建立成功
- 后端是否正确调用推送函数

**调试:**
```bash
# 监控 Redis 消息
redis-cli
> PSUBSCRIBE document:progress:*
```

### 2. 连接频繁断开

**可能原因:**
- 代理或负载均衡器超时
- 网络不稳定

**解决:**
- 增加心跳频率（默认30秒）
- 实现自动重连逻辑

## 相关文件

- `src/lib/document-tracker/index.ts` - 核心追踪器
- `src/app/api/document/progress/[documentId]/route.ts` - SSE API
- `src/actions/document-process.ts` - 集成进度推送
- `src/hooks/use-document-progress.ts` - React Hook (待创建)

