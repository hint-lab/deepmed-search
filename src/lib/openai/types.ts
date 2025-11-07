import { CoreMessage } from 'ai'

// OpenAI 配置类型
export interface OpenAIConfig {
    baseUrl: string;
    apiKey: string;
    organization?: string;
    model?: string;
    reasonModel?: string; // 思考模式专用模型
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}

// 消息类型 - 使用 AI SDK 的 CoreMessage
export type Message = CoreMessage

// 响应元数据类型
export interface ResponseMetadata {
    model: string;
    timestamp: string;
    isReason?: boolean;
    functionCall?: {
        name: string;
        arguments: any;
    };
    reasoningContent?: string; // 思维链内容
}

// 聊天响应类型
export interface ChatResponse {
    content: string;
    metadata: ResponseMetadata;
}

// 工具调用参数类型
export interface FunctionParameters {
    [key: string]: any;
}

// 工具定义类型
export interface Tool {
    name: string;
    description?: string;
    parameters?: any;
    handler: (params: any) => Promise<any>;
    execute?: (args: any, options?: any) => Promise<any>;
}

// 流式响应处理器类型
export type ChunkHandler = (chunk: string) => void;

// 聊天历史记录类型
export interface ChatHistory {
    addMessage: (message: Message) => void;
    getMessages: () => Message[];
    clear: () => void;
} 