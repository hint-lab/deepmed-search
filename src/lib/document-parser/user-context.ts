import { AsyncLocalStorage } from 'async_hooks';
import { DocumentParser } from '@/types/search';

export interface UserDocumentContext {
    userId: string;
    documentParser: DocumentParser;
    mineruApiKey?: string;
}

export const userDocumentContextStorage = new AsyncLocalStorage<UserDocumentContext>();

/**
 * 获取当前用户文档处理上下文
 * @returns 用户文档处理上下文
 */
export function getUserDocumentContext(): UserDocumentContext {
    const context = userDocumentContextStorage.getStore();
    if (!context) {
        throw new Error('用户文档处理上下文未设置。请确保在文档处理任务中初始化上下文。');
    }
    return context;
}

/**
 * 检查是否有用户文档处理上下文
 * @returns 是否存在上下文
 */
export function hasUserDocumentContext(): boolean {
    return userDocumentContextStorage.getStore() !== undefined;
}

/**
 * 获取 MinerU API Key
 * 优先从用户上下文获取，如果不存在则抛出错误
 * @returns MinerU API Key
 */
export function getMineruApiKey(): string {
    if (!hasUserDocumentContext()) {
        throw new Error('未找到用户上下文。请访问 /settings/search 页面配置 MinerU API Key');
    }

    const apiKey = getUserDocumentContext().mineruApiKey;
    if (!apiKey) {
        throw new Error('MinerU API Key 未配置。请访问 /settings/search 页面配置');
    }
    return apiKey;
}

/**
 * 获取文档解析器类型
 * 优先从用户上下文获取，如果不存在则返回默认值
 * @returns 文档解析器类型
 */
export function getDocumentParser(): DocumentParser {
    if (!hasUserDocumentContext()) {
        // 如果没有用户上下文，返回默认值
        return 'markitdown-docker';
    }

    return getUserDocumentContext().documentParser;
}

