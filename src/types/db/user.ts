import { Tenant } from './tenant';
import { Dialog } from './dialog';
import { Message } from './message';
import { SystemToken } from './system';


// 用户模型类型定义
export interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    password: string;
    language: string;
    tenantId?: string | null;
    tenant?: Tenant | null;
    dialogs: Dialog[];
    messages: Message[];
    systemTokens: SystemToken[];
    createdAt: Date;
    updatedAt: Date;
}

// 用户创建参数
export interface CreateUserParams {
    email: string;
    name?: string;
    image?: string;
    password: string;
    language?: string;
    tenantId?: string;
}

// 用户更新参数
export interface UpdateUserParams {
    name?: string;
    image?: string;
    language?: string;
    tenantId?: string;
} 