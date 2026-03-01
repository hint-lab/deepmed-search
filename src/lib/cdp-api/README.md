# CDP API 客户端

## 概述

本模块提供了调用 CDP (Causal Debate Platform) 后端 API 的 TypeScript 客户端函数。

## 功能

- **类型定义**: 完整的 TypeScript 类型定义，匹配 CDP 后端 API
- **API调用**: 封装 HTTP 请求，提供简洁的调用接口
- **错误处理**: 完善的错误处理和用户友好的错误消息
- **超时控制**: 支持请求超时设置（默认30秒）

## API 接口

### 1. 检索证据 (`fetchCDPRetrieval`)

调用 CDP 的 `/api/retrieve` 接口，获取证据列表。

```typescript
import { fetchCDPRetrieval } from '@/lib/cdp-api/client';

const result = await fetchCDPRetrieval(
  "Patient presents with episodic headaches, sweating, and palpitations",
  {
    topK: 5,
    timeout: 30000,
  }
);
```

**返回**: `RetrievalResponse`
- `pseudo_questions`: 生成的伪问题列表
- `evidence_panel`: 证据项列表
- `graph_data`: 知识图谱数据
- `mode`: 模式（"real" | "mock" | "deepmed"）
- `step_time`: 执行时间

### 2. 生成辩论 (`fetchCDPDebate`)

调用 CDP 的 `/api/debate` 接口，生成辩论过程。

```typescript
import { fetchCDPDebate } from '@/lib/cdp-api/client';

const result = await fetchCDPDebate(
  "Patient presents with episodic headaches, sweating, and palpitations",
  {
    topK: 5,
    timeout: 30000,
  }
);
```

**返回**: `DebateResponse`
- `debate_logs`: 辩论日志列表
- `diagnosis`: 诊断结果
- `confidence`: 置信度
- `reasoning_trace`: 推理轨迹
- `mode`: 模式（"real" | "mock" | "deepmed"）
- `step_time`: 执行时间

## 配置

### 环境变量

- `NEXT_PUBLIC_CDP_API_URL`: CDP API 地址（客户端）
- `CDP_API_URL`: CDP API 地址（服务器端）

**默认值**: `http://localhost:8000`

### 使用环境变量

在 `.env.local` 文件中设置：

```bash
NEXT_PUBLIC_CDP_API_URL=http://localhost:8000
```

## 错误处理

客户端会自动处理以下错误：

1. **网络错误**: "无法连接到CDP服务，请检查服务是否运行在 http://localhost:8000"
2. **超时错误**: "请求超时（30秒），请稍后重试"
3. **API错误**: 显示服务器返回的错误消息
4. **数据格式错误**: "响应数据格式错误：..."

## 类型定义

所有类型定义在 `types.ts` 文件中：

- `CDPBaseRequest`: API 请求格式
- `EvidenceItem`: 证据项
- `RetrievalResponse`: 检索响应
- `DebateResponse`: 辩论响应
- `CDPApiOptions`: API 调用选项

## 使用示例

```typescript
import { fetchCDPRetrieval, fetchCDPDebate } from '@/lib/cdp-api/client';

// 检索证据
try {
  const retrievalResult = await fetchCDPRetrieval(caseReport);
  console.log('证据数量:', retrievalResult.evidence_panel.length);
} catch (error) {
  console.error('检索失败:', error.message);
}

// 生成辩论
try {
  const debateResult = await fetchCDPDebate(caseReport);
  console.log('诊断:', debateResult.diagnosis);
  console.log('置信度:', debateResult.confidence);
} catch (error) {
  console.error('辩论生成失败:', error.message);
}
```

## 注意事项

1. **CORS配置**: 确保 CDP API 已配置 CORS，允许来自 DeepMed Search 的请求
2. **超时设置**: 根据网络情况调整超时时间
3. **错误处理**: 始终使用 try-catch 包装 API 调用
4. **数据验证**: 响应数据会自动进行基本验证

## 文件结构

```
src/lib/cdp-api/
├── types.ts      # 类型定义
├── client.ts     # API 客户端函数
└── README.md     # 本文件
```
