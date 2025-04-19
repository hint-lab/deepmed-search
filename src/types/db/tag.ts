import { KnowledgeBase } from './knowledge-base';
import { Document } from './document';

// 标签模型类型定义
export interface Tag {
    id: string;
    name: string;
    knowledgeBase: KnowledgeBase;
    knowledgeBaseId: string;
    documents: Document[];
    createdAt: Date;
    updatedAt: Date;
}

// 标签创建参数
export interface CreateTagParams {
    name: string;
    knowledgeBaseId: string;
}

// 标签更新参数
export interface UpdateTagParams {
    name?: string;
} 