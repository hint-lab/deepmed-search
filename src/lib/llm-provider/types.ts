import { CoreMessage } from 'ai';

/**
 * 提供商类型枚举
 */
export enum ProviderType {
  DeepSeek = 'deepseek',
  OpenAI = 'openai',
  Google = 'google',
}

/**
 * 消息角色类型
 */
export enum MessageRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
  Tool = 'tool',
  Reason = 'reason',
  ReasonReply = 'reasonReply',
}

/**
 * 消息类型
 */
export interface Message {
  role: string;
  content: string;
  name?: string;
  metadata?: {
    reasoningContent?: string;
    [key: string]: any;
  };
}

/**
 * 响应元数据
 */
export interface ResponseMetadata {
  model: string;
  provider: ProviderType;
  timestamp: string;
  isReason?: boolean;
  reasoningContent?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: any;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 聊天响应
 */
export interface ChatResponse {
  content: string;
  metadata: ResponseMetadata;
}

/**
 * 工具定义
 */
export interface Tool {
  name: string;
  description: string;
  parameters: any;
  handler: (params: any) => Promise<any>;
}

/**
 * 流式响应处理器
 */
export type ChunkResponse = string | {
  type: string;
  [key: string]: any;
};

export type ChunkHandler = (chunk: ChunkResponse) => void;

/**
 * 提供商配置基类
 */
export interface BaseProviderConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  model?: string;
  reasonModel?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * DeepSeek 配置
 */
export interface DeepSeekConfig extends BaseProviderConfig {
  model?: string; // deepseek-chat, deepseek-reasoner
}

/**
 * OpenAI 配置
 */
export interface OpenAIConfig extends BaseProviderConfig {
  model?: string; // gpt-4o, gpt-4o-mini, etc.
}

/**
 * Google (Gemini) 配置
 */
export interface GoogleConfig extends BaseProviderConfig {
  model?: string; // gemini-2.0-flash-exp, gemini-1.5-pro, etc.
}

/**
 * 聊天历史接口
 */
export interface ChatHistory {
  addMessage: (message: Message) => void;
  getMessages: () => Message[];
  clear: () => void;
}

/**
 * 聊天客户端选项
 */
export interface ChatOptions {
  dialogId: string;
  input: string;
  isReason?: boolean;
  tools?: Tool[];
  onChunk?: ChunkHandler;
}

/**
 * 提供商接口
 */
export interface Provider {
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

