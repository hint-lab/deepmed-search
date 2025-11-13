// 搜索配置类型定义

export type DocumentParser = 'markitdown-docker' | 'mineru-docker' | 'mineru-cloud';
export type EmbeddingProvider = 'openai' | 'volcengine';

export interface SearchConfig {
    id: string;
    tavilyApiKey?: string; // 不返回明文，只返回是否已配置
    jinaApiKey?: string;
    ncbiApiKey?: string;
    mineruApiKey?: string;
    searchProvider: 'tavily' | 'jina';
    documentParser: DocumentParser;
    embeddingProvider: EmbeddingProvider;
    embeddingModel: string;
    embeddingBaseUrl?: string;
    embeddingDimension: number;
    jinaChunkMaxLength?: number; // Jina 分块的最大长度
    hasTavilyApiKey: boolean;
    hasJinaApiKey: boolean;
    hasNcbiApiKey: boolean;
    hasMineruApiKey: boolean;
    hasEmbeddingApiKey: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateSearchConfigParams {
    tavilyApiKey?: string; // 可选，如果提供则更新
    jinaApiKey?: string;
    ncbiApiKey?: string;
    mineruApiKey?: string;
    searchProvider?: 'tavily' | 'jina';
    documentParser?: DocumentParser;
    embeddingProvider?: EmbeddingProvider;
    embeddingApiKey?: string;
    embeddingModel?: string;
    embeddingBaseUrl?: string;
    embeddingDimension?: number;
    jinaChunkMaxLength?: number; // Jina 分块的最大长度
}

