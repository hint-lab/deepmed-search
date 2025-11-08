# LLM Provider

统一的 LLM 提供商接口，使用 Vercel AI SDK 实现。支持 DeepSeek、OpenAI 和 Google (Gemini) 多个提供商。

## 特性

- 🔌 统一的接口设计，支持多个 LLM 提供商
- 🔄 完整的流式和非流式响应支持
- 🛠️ 内置工具调用（Function Calling）支持
- 💬 自动管理对话历史
- 🧠 支持思考模式（DeepSeek Reasoner）
- 📊 Token 使用统计
- 🎯 类型安全的 TypeScript 实现

## 支持的提供商

- **DeepSeek**: deepseek-chat, deepseek-reasoner
- **OpenAI**: gpt-4o, gpt-4o-mini, o1-preview, 等
- **Google**: gemini-2.0-flash-exp, gemini-1.5-pro, 等

## 安装依赖

```bash
yarn add @ai-sdk/deepseek @ai-sdk/openai @ai-sdk/google ai
```

## 环境变量配置

```env
# DeepSeek
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_MODEL=deepseek-chat
DEEPSEEK_API_REASON_MODEL=deepseek-reasoner

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_MODEL=gpt-4o-mini
OPENAI_ORGANIZATION=your_org_id

# Google (Gemini)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_API_MODEL=gemini-2.0-flash-exp
```

## 使用示例

### 基本聊天

```typescript
import { ProviderFactory, ProviderType } from '@/lib/llm-provider';

// 创建提供商实例
const provider = ProviderFactory.getProvider(ProviderType.DeepSeek);

// 发送消息
const response = await provider.chat({
  dialogId: 'user-123',
  input: '你好，请介绍一下你自己',
});

console.log(response.content);
console.log(response.metadata);
```

### 流式响应

```typescript
const response = await provider.chatStream({
  dialogId: 'user-123',
  input: '写一篇关于人工智能的文章',
  onChunk: (chunk) => {
    process.stdout.write(chunk);
  },
});
```

### 使用工具调用

```typescript
const tools = [
  {
    name: 'get_weather',
    description: '获取指定城市的天气信息',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '城市名称',
        },
      },
      required: ['city'],
    },
    handler: async ({ city }) => {
      // 实现获取天气的逻辑
      return { city, temp: 25, condition: '晴朗' };
    },
  },
];

const response = await provider.chatWithTools({
  dialogId: 'user-123',
  input: '北京今天天气怎么样？',
  tools,
});
```

### DeepSeek 思考模式

```typescript
const deepseekProvider = ProviderFactory.getProvider(ProviderType.DeepSeek);

const response = await deepseekProvider.chat({
  dialogId: 'user-123',
  input: '解释量子纠缠的原理',
  isReason: true, // 启用思考模式
});

// 查看推理过程
console.log('推理过程:', response.metadata.reasoningContent);
console.log('最终答案:', response.content);
```

### 自动选择提供商

```typescript
import { ProviderFactory } from '@/lib/llm-provider';

// 根据模型名称自动选择提供商
const provider = ProviderFactory.getProviderByModel('gpt-4o');
const response = await provider.chat({
  dialogId: 'user-123',
  input: 'Hello!',
});
```

### 使用默认提供商

```typescript
import { getDefaultProvider } from '@/lib/llm-provider';

// 自动根据环境变量选择可用的提供商
const provider = getDefaultProvider();
const response = await provider.chat({
  dialogId: 'user-123',
  input: '你好',
});
```

### 自定义配置

```typescript
import { ProviderFactory } from '@/lib/llm-provider';

const provider = ProviderFactory.createDeepSeek({
  apiKey: 'custom_api_key',
  model: 'deepseek-chat',
  temperature: 0.8,
  maxTokens: 4000,
  systemPrompt: '你是一个专业的医学助手',
});
```

### 管理对话历史

```typescript
// 获取历史记录
const history = provider.getHistory('user-123');
console.log(history);

// 清除历史记录
provider.clearHistory('user-123');

// 设置系统提示词
provider.setSystemPrompt('user-123', '你是一个友善的助手');
```

## API 文档

### Provider 接口

所有提供商都实现了统一的 `Provider` 接口：

```typescript
interface Provider {
  readonly type: ProviderType;
  readonly model: string;
  readonly reasonModel?: string;
  
  chat(options: ChatOptions): Promise<ChatResponse>;
  chatStream(options: ChatOptions): Promise<ChatResponse>;
  chatWithTools(options: ChatOptions): Promise<ChatResponse>;
  chatWithToolsStream(options: ChatOptions): Promise<ChatResponse>;
  
  clearHistory(dialogId: string): void;
  getHistory(dialogId: string): Message[];
  setSystemPrompt(dialogId: string, prompt: string): void;
}
```

### ChatOptions

```typescript
interface ChatOptions {
  dialogId: string;        // 对话 ID
  input: string;           // 用户输入
  isReason?: boolean;      // 是否使用思考模式（仅 DeepSeek）
  tools?: Tool[];          // 工具列表
  onChunk?: ChunkHandler;  // 流式响应处理器
}
```

### ChatResponse

```typescript
interface ChatResponse {
  content: string;                 // 响应内容
  metadata: ResponseMetadata;      // 响应元数据
}

interface ResponseMetadata {
  model: string;                   // 使用的模型
  provider: ProviderType;          // 提供商类型
  timestamp: string;               // 时间戳
  isReason?: boolean;              // 是否为思考模式
  reasoningContent?: string;       // 推理过程（仅 DeepSeek Reasoner）
  toolCalls?: ToolCall[];          // 工具调用信息
  usage?: UsageInfo;               // Token 使用统计
}
```

## 架构设计

```
llm-provider/
├── index.ts           # 主入口，提供商工厂
├── types.ts           # 类型定义
├── config.ts          # 配置管理
├── history.ts         # 对话历史管理
├── utils.ts           # 工具函数
├── providers/
│   ├── deepseek.ts    # DeepSeek 实现
│   ├── openai.ts      # OpenAI 实现
│   └── google.ts      # Google 实现
└── README.md          # 文档
```

## 迁移指南

### 从旧的 DeepSeek 客户端迁移

```typescript
// 旧代码
import { chatClient } from '@/lib/deepseek';
const response = await chatClient.chatStream(dialogId, input, onChunk);

// 新代码
import { ProviderFactory, ProviderType } from '@/lib/llm-provider';
const provider = ProviderFactory.getProvider(ProviderType.DeepSeek);
const response = await provider.chatStream({ dialogId, input, onChunk });
```

### 从旧的 OpenAI 客户端迁移

```typescript
// 旧代码
import { chatClient } from '@/lib/openai';
const response = await chatClient.chat(dialogId, input);

// 新代码
import { ProviderFactory, ProviderType } from '@/lib/llm-provider';
const provider = ProviderFactory.getProvider(ProviderType.OpenAI);
const response = await provider.chat({ dialogId, input });
```

## 最佳实践

1. **使用单例模式**: 通过 `ProviderFactory.getProvider()` 获取提供商实例，避免重复创建
2. **合理使用 dialogId**: 每个用户会话使用唯一的 dialogId 来管理对话历史
3. **错误处理**: 所有方法都可能抛出异常，建议使用 try-catch 包裹
4. **流式响应**: 对于长文本生成，优先使用流式 API 提升用户体验
5. **工具调用**: 利用工具调用功能实现复杂的交互逻辑

## 许可证

MIT

