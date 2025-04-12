import { User } from './user';
import { KnowledgeBase } from './knowledge-base';

// 租户模型类型定义
export interface Tenant {
    id: string;
    name: string;
    embd_id?: string | null;
    llm_id?: string | null;
    asr_id?: string | null;
    parser_ids?: string | null;
    chat_id?: string | null;
    speech2text_id?: string | null;
    tts_id?: string | null;
    users: User[];
    knowledgeBases: KnowledgeBase[];
    createdAt: Date;
    updatedAt: Date;
}

// 租户创建参数
export interface CreateTenantParams {
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
export interface UpdateTenantParams {
    name?: string;
    embd_id?: string;
    llm_id?: string;
    asr_id?: string;
    parser_ids?: string;
    chat_id?: string;
    speech2text_id?: string;
    tts_id?: string;
} 