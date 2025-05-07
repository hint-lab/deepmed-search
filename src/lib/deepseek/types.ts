// DeepSeek API 响应类型
export interface DeepSeekResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        message: {
            role: string;
            content: string;
            reasoning_content?: string; // 思维链内容
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

// DeepSeek 流式响应类型
export interface DeepSeekStreamResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        delta: {
            content?: string;
            role?: string;
            reasoning_content?: string; // 思维链内容
        };
        finish_reason: string | null;
        index: number;
    }[];
}

// DeepSeek 配置类型
export interface DeepSeekConfig {
    baseUrl: string;
    apiKey: string;
    organization?: string;
    model?: string;
    reasonModel?: string; // 思考模式专用模型
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
    description: string;
    parameters: any;
    handler: (params: any) => Promise<any>;
}

// 流式响应处理器类型
export type ChunkResponse = string | {
    type: string;
    [key: string]: any;
};
export type ChunkHandler = (chunk: ChunkResponse) => void;
// 定义 ChunkResponse 和 ReferenceData 类型 (如果它们不在此文件的顶部)


// 聊天历史记录类型
export interface ChatHistory {
    addMessage: (message: Message) => void;
    getMessages: () => Message[];
    clear: () => void;
} 