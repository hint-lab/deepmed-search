import { ITenant } from './tenant';
import { IDialog } from './dialog';
import { IMessage } from './message';
import { ISystemToken } from './system';


// 用户模型类型定义
export interface IUser {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    password: string;
    language: string;
    tenantId?: string | null;
    tenant?: ITenant | null;
    dialogs: IDialog[];
    messages: IMessage[];
    systemTokens: ISystemToken[];
    createdAt: Date;
    updatedAt: Date;
}

// 用户创建参数
export interface CreateIUserParams {
    email: string;
    name?: string;
    image?: string;
    password: string;
    language?: string;
    tenantId?: string;
}

// 用户更新参数
export interface UpdateIUserParams {
    name?: string;
    image?: string;
    language?: string;
    tenantId?: string;
}

// 用户信息模型类型定义， 遵循next-auth中的UserInfo定义
export interface IUserInfo {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
}