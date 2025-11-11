// 搜索配置类型定义

export interface SearchConfig {
    id: string;
    tavilyApiKey?: string; // 不返回明文，只返回是否已配置
    jinaApiKey?: string;
    ncbiApiKey?: string;
    searchProvider: 'tavily' | 'jina';
    hasTavilyApiKey: boolean;
    hasJinaApiKey: boolean;
    hasNcbiApiKey: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateSearchConfigParams {
    tavilyApiKey?: string; // 可选，如果提供则更新
    jinaApiKey?: string;
    ncbiApiKey?: string;
    searchProvider?: 'tavily' | 'jina';
}

