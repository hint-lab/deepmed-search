import { IUser } from './user';
import { IKnowledgeBase } from './knowledgebase';

// 租户模型类型定义
export interface ITenant {
    id: string;
    name: string;
    embd_id?: string | null;
    llm_id?: string | null;
    parser_ids?: string[] | null;
    users: IUser[];
    knowledgeBases: IKnowledgeBase[];
    createdAt: Date;
    updatedAt: Date;
}

// 租户创建参数
export interface CreateITenantParams {
    name: string;
    embd_id?: string;
    llm_id?: string;
    asr_id?: string;
    parser_ids?: string;
    chat_id?: string;
    speech2text_id?: string;
    tts_id?: string;
}

// 租户更新参数
export interface UpdateITenantParams {
    name?: string;
    embd_id?: string;
    llm_id?: string;
    asr_id?: string;
    parser_ids?: string;
    chat_id?: string;
    speech2text_id?: string;
    tts_id?: string;
} 