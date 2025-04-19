import { User } from './user';
import { Dialog } from './dialog';

// 系统状态模型类型定义
export interface SystemStatus {
    id: string;
    status: string;
    message?: string | null;
    updatedAt: Date;
}

// 系统令牌模型类型定义
export interface SystemToken {
    id: string;
    name: string;
    token: string;
    userId: string;
    user: User;
    createdAt: Date;
    lastUsedAt?: Date | null;
}

// Langfuse配置模型类型定义
export interface LangfuseConfig {
    id: string;
    userId: string;
    user: User;
    publicKey: string;
    secretKey: string;
    host: string;
    createdAt: Date;
    updatedAt: Date;
}

// 相关问题模型类型定义
export interface RelatedQuestion {
    id: string;
    question: string;
    dialogId: string;
    dialog: Dialog;
    createdAt: Date;
    updatedAt: Date;
}

// 系统状态创建参数
export interface CreateSystemStatusParams {
    status: string;
    message?: string;
}

// 系统令牌创建参数
export interface CreateSystemTokenParams {
    name: string;
    token: string;
    userId: string;
}

// Langfuse配置创建参数
export interface CreateLangfuseConfigParams {
    userId: string;
    publicKey: string;
    secretKey: string;
    host: string;
}

// 相关问题创建参数
export interface CreateRelatedQuestionParams {
    question: string;
    dialogId: string;
} 