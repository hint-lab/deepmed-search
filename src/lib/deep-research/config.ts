import { createOpenAI, OpenAIProviderSettings } from '@ai-sdk/openai';
import logger from '@/utils/logger';

// ========== API 密钥配置 ==========
// 注意：所有 API keys 都从用户配置（AsyncLocalStorage）获取
// 不再使用环境变量，所有配置均由用户在 /settings/llm 和 /settings/search 页面设置


// 直接在代码中定义回退默认值
const FALLBACK_DEFAULTS = {
    LLM_PROVIDER: 'deepseek', // 例如: 'openai' 
    SEARCH_PROVIDER: 'jina', // 例如: 'jina', 'duck' 
    STEP_SLEEP: 1000, // 毫秒
    DEFAULT_MODEL_NAME: 'deepseek-chat', // DeepSeek 默认模型
    DEFAULT_TEMPERATURE: 0.2,
    DEFAULT_MAX_TOKENS: 8192,
    OPENAI_COMPATIBILITY: 'compatible' as const, // DeepSeek 需要兼容模式
};

// 类型定义
export type LLMProvider = 'openai' | 'deepseek'; // LLM 提供者类型 (支持 openai 和 deepseek，deepseek 使用 OpenAI 兼容接口)
export type SearchProvider = 'jina' | 'duck'; // 搜索提供者类型 (目前支持 jina 和 duck)

// LLM 提供者（仅用于内部默认值，实际使用时从用户配置获取）
export const LLM_PROVIDER: LLMProvider = FALLBACK_DEFAULTS.LLM_PROVIDER as LLMProvider;

// 搜索提供者（仅用于内部默认值，实际使用时从用户配置获取）
export const SEARCH_PROVIDER: SearchProvider = FALLBACK_DEFAULTS.SEARCH_PROVIDER as SearchProvider;

// 明确定义工具名称 (如果固定或需要推断)
// 示例: 如果你知道你会使用 'agent', 'evaluator', 'searchGrounding'
export type ToolName =
    | 'agent'
    | 'evaluator'
    | 'searchGrounding'
    | 'queryRewriter'
    | 'deduplicator'
    | 'errorAnalyzer'
    | 'mdFixer'
    | 'refBuilder'
    | 'agentBeastMode'
    | 'brokenChFixer'
    | 'fallback'; // 回退模型，用于错误恢复

interface ToolConfig {
    model: string;
    temperature: number;
    maxTokens: number;
}

// 获取工具配置（使用默认值）
export function getToolConfig(toolName: ToolName): ToolConfig {
    // 所有工具使用统一的默认配置
    // 用户的 LLM 配置会在运行时通过 AsyncLocalStorage 应用
    return {
        model: FALLBACK_DEFAULTS.DEFAULT_MODEL_NAME,
        temperature: FALLBACK_DEFAULTS.DEFAULT_TEMPERATURE,
        maxTokens: FALLBACK_DEFAULTS.DEFAULT_MAX_TOKENS
    };
}

export function getMaxTokens(toolName: ToolName): number {
    return getToolConfig(toolName).maxTokens;
}

// 根据配置的提供者和工具设置获取模型实例
// 优先从 AsyncLocalStorage 的用户上下文获取配置
// 如果上下文不存在，则回退到环境变量（用于非研究任务）
export function getModel(toolName: ToolName) {
    const config = getToolConfig(toolName);
    const opt: OpenAIProviderSettings = {};

    // 尝试从用户上下文获取配置（AsyncLocalStorage）
    const { hasUserContext, getLLMConfig } = require('./user-context');

    if (!hasUserContext()) {
        throw new Error('未找到用户上下文。所有 LLM 调用必须在用户上下文中执行。请确保已在 /settings/llm 页面配置 API Key');
    }

    // 使用用户特定的配置（从 AsyncLocalStorage）
    const llmConfig = getLLMConfig();

    opt.apiKey = llmConfig.apiKey;
    if (llmConfig.baseUrl) {
        opt.baseURL = llmConfig.baseUrl;
    }
    opt.compatibility = llmConfig.type === 'deepseek' ? 'compatible' : 'strict';

    logger.info(`[getModel] 使用用户配置 (${llmConfig.type}), 工具: ${String(toolName)}, 模型: ${config.model}`);

    try {
        return createOpenAI(opt)(config.model);
    } catch (error) {
        logger.error(`为模型 ${config.model} 创建客户端失败，选项:`, opt, error);
        throw error;
    }
}

// --- 运行时配置 ---
// 注意：所有 API keys 和 LLM 配置都从用户配置（AsyncLocalStorage）获取
// 不再依赖环境变量

// 步骤间延迟（使用默认值）
export const STEP_SLEEP = FALLBACK_DEFAULTS.STEP_SLEEP; 