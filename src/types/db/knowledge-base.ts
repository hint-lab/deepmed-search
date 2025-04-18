import { IDocument } from './document';
import { ITag } from './tag';
import { IChunk } from './chunk';
import { IDialog } from './dialog';

export interface IKnowledgeBase {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
    chunk_num: number;
    create_date: Date;
    create_time: bigint;
    created_by: string;
    doc_num: number;
    parser_config?: Record<string, any>;
    parser_id?: string;
    permission?: string;
    similarity_threshold: number;
    status: string;
    tenant_id?: string;
    token_num: number;
    update_date: Date;
    update_time: bigint;
    vector_similarity_weight: number;
    embd_id?: string;
    nickname?: string;
    language?: string;
    operator_permission: number;
    visible: boolean;
    createdAt: Date;
    updatedAt: Date;
    documents?: IDocument[];
    tags?: ITag[];
    chunks?: IChunk[];
    dialogs?: IDialog[];
}

export interface IKnowledgeListItem extends Pick<IKnowledgeBase, 'id' | 'name' | 'description' | 'avatar' | 'doc_num' | 'chunk_num' | 'createdAt' | 'visible'> {
    // 可以添加列表项特有的字段
}

export interface ICreateKnowledgeParams {
    name: string;
    description?: string;
    avatar?: string;
    parser_id?: string;
    parser_config?: Record<string, any>;
    similarity_threshold?: number;
    vector_similarity_weight?: number;
    embd_id?: string;
    language?: string;
    visible?: boolean;
}

export interface IUpdateKnowledgeParams extends Partial<ICreateKnowledgeParams> {
    id: string;
}

export interface ISearchKnowledgeParams {
    keyword?: string;
    keywords?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface ISearchKnowledgeResult {
    items: IKnowledgeListItem[];
    total: number;
    page: number;
    pageSize: number;
}

export interface ITestingResult {
    success: boolean;
    message?: string;
    data?: {
        chunks: Array<{
            id: string;
            content: string;
        }>;
        documents: Array<{
            id: string;
            name: string;
            content: string;
        }>;
        total: number;
    };
}

export interface IKnowledgeGraph {
    nodes: Array<{
        id: string;
        label: string;
        type: string;
    }>;
    edges: Array<{
        source: string;
        target: string;
        label?: string;
    }>;
    graph: Record<string, any>;
    mind_map: Record<string, any>;
} 