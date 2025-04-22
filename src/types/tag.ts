import { IKnowledgeBase } from './knowledgebase';

// 标签模型类型定义
export interface ITag {
    id: string;
    name: string;
    knowledgeBase: IKnowledgeBase;
    knowledgeBaseId: string;
    documents: Document[];
    createdAt: Date;
    updatedAt: Date;
}

// 标签创建参数
export interface CreateITagParams {
    name: string;
    knowledgeBaseId: string;
}

// 标签更新参数
export interface UpdateITagParams {
    name?: string;
} 