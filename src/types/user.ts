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

// 用户 LLM 配置（单个配置）
export interface LLMConfig {
    id: string;
    name: string;
    provider: 'deepseek' | 'openai' | 'google';
    model?: string;
    reasonModel?: string;
    baseUrl?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// 用户 LLM 配置列表（不包含 API Key）
export interface UserLLMConfigList {
    configs: LLMConfig[];
    activeConfig?: LLMConfig;
}

// 创建/更新 LLM 配置的参数
export interface CreateLLMConfigParams {
    name: string;
    provider: 'deepseek' | 'openai' | 'google';
    apiKey: string; // 明文 API Key，服务端会加密
    model?: string;
    reasonModel?: string;
    baseUrl?: string;
}

// 更新 LLM 配置的参数（不包含 API Key）
export interface UpdateLLMConfigParams {
    id: string;
    name?: string;
    model?: string;
    reasonModel?: string;
    baseUrl?: string;
    apiKey?: string; // 可选，如果提供则更新
}