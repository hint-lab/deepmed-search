import { createOpenAI, OpenAIProviderSettings } from '@ai-sdk/openai';

// 从环境变量读取 API 密钥和其他配置
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const JINA_API_KEY = process.env.JINA_API_KEY;
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;


// 直接在代码中定义回退默认值
const FALLBACK_DEFAULTS = {
    LLM_PROVIDER: 'openai', // 例如: 'openai' 
    SEARCH_PROVIDER: 'jina', // 例如: 'jina', 'duck' 
    STEP_SLEEP: 1000, // 毫秒
    DEFAULT_MODEL_NAME: 'gpt-4o-mini', // 合理的默认模型
    DEFAULT_TEMPERATURE: 0.7,
    DEFAULT_MAX_TOKENS: 2048,
    OPENAI_COMPATIBILITY: undefined, // 'strict' | 'compatible' | undefined (OpenAI 兼容性设置)
};

// 类型定义
export type LLMProvider = 'openai'; // LLM 提供者类型 (目前仅 openai)
export type SearchProvider = 'jina' | 'duck'; // 搜索提供者类型 (目前支持 jina 和 duck)

// 确定 LLM 提供者
export const LLM_PROVIDER: LLMProvider = (() => {
    const provider = process.env.LLM_PROVIDER || FALLBACK_DEFAULTS.LLM_PROVIDER;
    if (provider !== 'openai') {
        console.warn(`无效或不支持的 LLM_PROVIDER: ${provider}。将使用默认值 '${FALLBACK_DEFAULTS.LLM_PROVIDER}'。`);
        return FALLBACK_DEFAULTS.LLM_PROVIDER as LLMProvider;
    }
    return provider;
})();

// 确定搜索提供者
export const SEARCH_PROVIDER: SearchProvider = (() => {
    const provider = process.env.SEARCH_PROVIDER || FALLBACK_DEFAULTS.SEARCH_PROVIDER;
    if (!isValidSearchProvider(provider)) {
        console.warn(`无效的 SEARCH_PROVIDER: ${provider}。将使用默认值 '${FALLBACK_DEFAULTS.SEARCH_PROVIDER}'。`);
        return FALLBACK_DEFAULTS.SEARCH_PROVIDER as SearchProvider;
    }
    return provider;
})();

function isValidSearchProvider(provider: string): provider is SearchProvider {
    return ['jina', 'duck'].includes(provider);
}

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
    | 'codeGenerator'
    | 'agentBeastMode'
    | 'brokenChFixer'; // 添加 getModel 调用中使用的所有工具名称

interface ToolConfig {
    model: string;
    temperature: number;
    maxTokens: number;
}

// 从环境变量获取工具配置
export function getToolConfig(toolName: ToolName): ToolConfig {
    const upperToolName = toolName.toUpperCase();

    // 优先级：工具特定环境变量 -> 通用环境变量 -> 回退默认值
    const model = process.env[`DEEPRESEARCH_${upperToolName}_MODEL`] ||
        process.env.DEEPRESEARCH_DEFAULT_MODEL ||
        FALLBACK_DEFAULTS.DEFAULT_MODEL_NAME;

    const temperature = (() => {
        let tempValue = process.env[`DEEPRESEARCH_${upperToolName}_TEMP`];
        let defaultValue = FALLBACK_DEFAULTS.DEFAULT_TEMPERATURE;
        // 如果工具特定的未设置，尝试通用默认值
        if (tempValue === undefined) {
            tempValue = process.env.DEEPRESEARCH_DEFAULT_TEMP;
        }
        // 如果仍然未定义，使用回退默认值
        if (tempValue === undefined) {
            return defaultValue;
        }
        const parsed = parseFloat(tempValue);
        return isNaN(parsed) ? defaultValue : parsed;
    })();

    const maxTokens = (() => {
        let tokensValue = process.env[`DEEPRESEARCH_${upperToolName}_MAX_TOKENS`];
        let defaultValue = FALLBACK_DEFAULTS.DEFAULT_MAX_TOKENS;
        // 如果工具特定的未设置，尝试通用默认值
        if (tokensValue === undefined) {
            tokensValue = process.env.DEEPRESEARCH_DEFAULT_MAX_TOKENS;
        }
        // 如果仍然未定义，使用回退默认值
        if (tokensValue === undefined) {
            return defaultValue;
        }
        const parsed = parseInt(tokensValue, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    })();

    return {
        model,
        temperature,
        maxTokens
    };
}

export function getMaxTokens(toolName: ToolName): number {
    return getToolConfig(toolName).maxTokens;
}

// 根据配置的提供者和工具设置获取模型实例
export function getModel(toolName: ToolName) {
    const config = getToolConfig(toolName);
    // 从环境变量获取特定于提供者的设置
    const openAICompatibility = process.env.OPENAI_COMPATIBILITY as 'strict' | 'compatible' | undefined || FALLBACK_DEFAULTS.OPENAI_COMPATIBILITY;

    console.log(`getModel 调用，工具: ${String(toolName)}, 提供者: ${LLM_PROVIDER}, 解析配置:`, config);

    if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY 在环境变量中未找到');
    }
    const opt: OpenAIProviderSettings = {
        apiKey: OPENAI_API_KEY,
    };
    if (openAICompatibility) {
        opt.compatibility = openAICompatibility;
    }
    if (OPENAI_BASE_URL) {
        opt.baseURL = OPENAI_BASE_URL;
        console.log(`使用 OpenAI Base URL: ${opt.baseURL}`);
    }
    try {
        return createOpenAI(opt)(config.model);
    } catch (error) {
        console.error(`为模型 ${config.model} 创建 OpenAI 客户端失败，选项:`, opt, error);
        throw error;
    }
}

// --- 初始验证和日志记录 ---

// 根据选定的提供者验证必需的 API 密钥
if (LLM_PROVIDER === 'openai' && !OPENAI_API_KEY) console.error("错误: LLM_PROVIDER 是 'openai' 但 OPENAI_API_KEY 未设置。");

// 警告搜索提供者密钥缺失
if (SEARCH_PROVIDER === 'jina' && !JINA_API_KEY) console.warn("警告: SEARCH_PROVIDER 是 'jina' 但 JINA_API_KEY 未设置。");

// 定义 STEP_SLEEP (从环境变量读取或使用默认值)
export const STEP_SLEEP = (() => {
    const value = process.env.STEP_SLEEP;
    if (value === undefined) {
        return FALLBACK_DEFAULTS.STEP_SLEEP;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? FALLBACK_DEFAULTS.STEP_SLEEP : parsed;
})();

// 仅在非生产环境中记录有效配置
if (process.env.NODE_ENV !== 'production') {
    try {
        // 手动收集所有已知工具名称以供摘要
        const allToolNames: ToolName[] = [
            'agent', 'evaluator', 'searchGrounding', 'queryRewriter', 'deduplicator',
            'errorAnalyzer', 'mdFixer', 'refBuilder', 'codeGenerator', 'agentBeastMode', 'brokenChFixer'
        ];

        const configSummary = {
            provider: {
                name: LLM_PROVIDER, // LLM 提供者名称
                effectiveDefaultModel: getToolConfig('agent').model, // agent 使用的有效默认模型
                ...(LLM_PROVIDER === 'openai' && { baseUrl: OPENAI_BASE_URL }), // OpenAI Base URL (如果使用)
                ...(LLM_PROVIDER === 'openai' && { compatibility: process.env.OPENAI_COMPATIBILITY || FALLBACK_DEFAULTS.OPENAI_COMPATIBILITY }), // OpenAI 兼容性 (如果使用)
            },
            search: {
                provider: SEARCH_PROVIDER // 搜索提供者名称
            },
            tools: Object.fromEntries(
                allToolNames.map(name => [
                    name,
                    getToolConfig(name)
                ])
            ),
            defaults: {
                stepSleep: STEP_SLEEP // 步骤间延迟
            }
        };
        console.log('有效配置摘要 (来自环境变量或默认值):', JSON.stringify(configSummary, null, 2));
    } catch (error) {
        console.error("生成配置摘要时出错:", error);
    }
} 