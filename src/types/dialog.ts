import { IMessage } from './message';
import { RelatedQuestion } from './system';

// 对话模型类型定义
export interface IDialog {
    id: string;
    name: string;
    description?: string | null;
    userId: string;
    knowledgeBaseId?: string | null;
    create_date: Date;
    update_date: Date;
    messages: IMessage[];
    relatedQuestions: RelatedQuestion[];
}

// 对话创建参数
export interface CreateDialogParams {
    name: string;
    description?: string;
    userId: string;
    knowledgeBaseId?: string;
}

// 对话更新参数
export interface UpdateDialogParams {
    name?: string;
    description?: string;
    knowledgeBaseId?: string;
} 