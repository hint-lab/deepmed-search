import { User } from './user';
import { Dialog } from './dialog';

// 消息模型类型定义
export interface IMessage {
    id: string;
    content: string;
    role: string;
    dialogId: string;
    dialog: Dialog;
    userId: string;
    user: User;
    createdAt: Date;
    updatedAt: Date;
}

// 消息创建参数
export interface CreateIMessageParams {
    content: string;
    role?: string;
    dialogId: string;
    userId: string;
}

// 消息更新参数
export interface UpdateIMessageParams {
    content?: string;
    role?: string;
} 