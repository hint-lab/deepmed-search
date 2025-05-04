// 消息模型类型定义
export interface IMessage {
    id: string;
    content: string;
    role: string;
    dialogId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    thinkingContent?: string;
    isThinking?: boolean;
}

// 消息创建参数
export interface CreateIMessageParams {
    content: string;
    role?: string;
    dialogId: string;
    userId: string;
    thinkingContent?: string;
    isThinking?: boolean;
}

// 消息更新参数
export interface UpdateIMessageParams {
    content?: string;
    role?: string;
    thinkingContent?: string;
    isThinking?: boolean;
} 