import { IUser } from './user';
import { IDialog } from './dialog';

// 系统状态模型类型定义
export interface ISystemStatus {
    id: string;
    status: string;
    message?: string | null;
    updatedAt: Date;
}

// 系统令牌模型类型定义
export interface ISystemToken {
    id: string;
    name: string;
    token: string;
    userId: string;
    user: IUser;
    createdAt: Date;
    lastUsedAt?: Date | null;
}

// 相关问题模型类型定义
export interface RelatedQuestion {
    id: string;
    question: string;
    dialogId: string;
    dialog: IDialog;
    createdAt: Date;
    updatedAt: Date;
}

// 系统状态创建参数
export interface CreateISystemStatusParams {
    status: string;
    message?: string;
}

// 系统令牌创建参数
export interface CreateISystemTokenParams {
    name: string;
    token: string;
    userId: string;
}

// 相关问题创建参数
export interface CreateIRelatedQuestionParams {
    question: string;
    dialogId: string;
} 