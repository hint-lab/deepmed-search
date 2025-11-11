import { AsyncLocalStorage } from 'async_hooks';

/**
 * 用户研究任务上下文
 * 包含用户特定的配置信息，在整个研究任务执行过程中保持隔离
 */
export interface UserResearchContext {
    userId: string; // 用户ID
    llmConfig: {
        type: 'deepseek' | 'openai' | 'google';
        apiKey: string;
        baseUrl?: string;
        model?: string;
    };
    searchConfig: {
        searchProvider: 'tavily' | 'jina';
        jinaApiKey?: string;
        tavilyApiKey?: string;
        ncbiApiKey?: string;
    };
}

/**
 * AsyncLocalStorage 实例
 * 为每个异步执行链提供独立的用户上下文存储
 * 确保并发任务之间的配置隔离
 */
export const userContextStorage = new AsyncLocalStorage<UserResearchContext>();

/**
 * 获取当前用户上下文
 * @returns 当前任务的用户配置
 * @throws 如果上下文未设置则抛出错误
 */
export function getUserContext(): UserResearchContext {
    const context = userContextStorage.getStore();
    if (!context) {
        throw new Error(
            '用户上下文未设置。请确保在 processResearchTask 中使用 userContextStorage.run() 初始化上下文。'
        );
    }
    return context;
}

/**
 * 检查是否存在用户上下文
 * @returns 如果当前执行链有用户上下文则返回 true
 */
export function hasUserContext(): boolean {
    return userContextStorage.getStore() !== undefined;
}

/**
 * 获取当前用户的 LLM 配置
 * @returns LLM 配置对象
 */
export function getLLMConfig() {
    return getUserContext().llmConfig;
}

/**
 * 获取当前用户的搜索配置
 * @returns 搜索配置对象
 */
export function getSearchConfig() {
    return getUserContext().searchConfig;
}

/**
 * 获取 Jina API Key
 * 从用户上下文获取（必须在研究任务上下文中调用）
 * @returns Jina API Key
 */
export function getJinaApiKey(): string {
    if (!hasUserContext()) {
        throw new Error('未找到用户上下文。请访问 /settings/search 页面配置 Jina API Key');
    }

    const apiKey = getUserContext().searchConfig.jinaApiKey;
    if (!apiKey) {
        throw new Error('Jina API Key 未配置。请访问 /settings/search 页面配置');
    }
    return apiKey;
}

/**
 * 获取 Tavily API Key
 * 从用户上下文获取（必须在研究任务上下文中调用）
 * @returns Tavily API Key
 */
export function getTavilyApiKey(): string {
    if (!hasUserContext()) {
        throw new Error('未找到用户上下文。请访问 /settings/search 页面配置 Tavily API Key');
    }

    const apiKey = getUserContext().searchConfig.tavilyApiKey;
    if (!apiKey) {
        throw new Error('Tavily API Key 未配置。请访问 /settings/search 页面配置');
    }
    return apiKey;
}

/**
 * 获取 NCBI API Key
 * 从用户上下文获取（必须在研究任务上下文中调用）
 * @returns NCBI API Key（可选）
 */
export function getNCBIApiKey(): string | undefined {
    if (!hasUserContext()) {
        return undefined; // NCBI API Key 是可选的
    }

    return getUserContext().searchConfig.ncbiApiKey;
}

