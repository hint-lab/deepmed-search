import OpenAI from 'openai'

// OpenAI API 响应类型
export interface OpenAIResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        message: {
            role: string;
            content: string;
            function_call?: {
                name: string;
                arguments: string;
            };
        };
        finish_reason: string;
        index: number;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// OpenAI 流式响应类型
export interface OpenAIStreamResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        delta: {
            content?: string;
            role?: string;
        };
        finish_reason: string | null;
        index: number;
    }[];
}

// OpenAI 配置类型
export interface OpenAIConfig {
    baseUrl: string;
    apiKey: string;
    organization?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
    systemPrompt?: string;
}

// 消息类型
export type Message = {
    role: 'system' | 'user' | 'assistant' | 'function'
    content: string
    name?: string
    function_call?: {
        name: string
        arguments: string
    }
} & {
    role: 'system' | 'user' | 'assistant'
} | {
    role: 'function'
    name: string
}

// 响应元数据类型
export interface ResponseMetadata {
    model: string;
    timestamp: string;
    functionCall?: {
        name: string;
        arguments: any;
    };
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
    description: string;
    parameters: any;
    handler: (params: any) => Promise<any>;
}

// 流式响应处理器类型
export type ChunkHandler = (chunk: string) => void;

// 聊天历史记录类型
export interface ChatHistory {
    addMessage: (message: Message) => void;
    getMessages: () => Message[];
    clear: () => void;
} 