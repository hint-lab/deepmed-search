import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createDeepSeek } from '@ai-sdk/deepseek';
// Import other provider creators if needed:
// import { createAnthropic } from '@ai-sdk/anthropic';
// import { createVertex } from '@ai-sdk/google-vertex';
import { LanguageModelV1 } from '@ai-sdk/provider';

// LLM 配置类型
export interface LLMConfig {
    provider: 'deepseek' | 'openai' | 'google';
    apiKey: string;
    baseUrl?: string;
    model?: string;
}


// --- Define Provider Types ---
type GoogleProviderType = ReturnType<typeof createGoogleGenerativeAI>;
type OpenAIProviderType = ReturnType<typeof createOpenAI>;
type DeepSeekProviderType = ReturnType<typeof createDeepSeek>;
// Define types for other providers if needed

// --- Get Model Instance Function ---
/**
 * Gets an initialized AI SDK LanguageModelV1 instance based on the model ID.
 * 必须提供用户配置，不再支持环境变量回退。
 * @param modelId - The identifier for the model (e.g., 'gemini-1.5-flash-latest', 'gpt-4o-mini', 'deepseek-chat').
 * @param llmConfig - 用户 LLM 配置（API key, provider, etc.），必需参数
 * @returns An initialized LanguageModelV1 instance.
 * @throws Error if llmConfig is not provided or provider doesn't match model ID
 */
export function getModelInstance(modelId: string, llmConfig: LLMConfig): LanguageModelV1 {
    console.log(`[LLM Config] Requesting model instance for: ${modelId}`);

    // 必须提供用户配置
    if (!llmConfig) {
        throw new Error('未提供用户 LLM 配置。请访问 /settings/llm 页面配置您的 API Key。');
    }

    console.log(`[LLM Config] Using user config for model: ${modelId}, provider: ${llmConfig.provider}`);

    if (modelId.startsWith('gemini') && llmConfig.provider === 'google') {
        const userGoogle = createGoogleGenerativeAI({
            apiKey: llmConfig.apiKey,
            baseURL: llmConfig.baseUrl,
        });
        console.log(`[LLM Config] Providing Google AI model from user config: ${modelId}`);
        return userGoogle(modelId as any);
    } else if (modelId.startsWith('gpt-') && llmConfig.provider === 'openai') {
        const userOpenAI = createOpenAI({
            apiKey: llmConfig.apiKey,
            baseURL: llmConfig.baseUrl,
        });
        console.log(`[LLM Config] Providing OpenAI model from user config: ${modelId}`);
        return userOpenAI(modelId as any);
    } else if (modelId.startsWith('deepseek') && llmConfig.provider === 'deepseek') {
        const userDeepSeek = createDeepSeek({
            apiKey: llmConfig.apiKey,
            baseURL: llmConfig.baseUrl || 'https://api.deepseek.com/v1',
        });
        console.log(`[LLM Config] Providing DeepSeek model from user config: ${modelId}`);
        return userDeepSeek(modelId as any);
    } else {
        const errorMsg = `用户配置的 provider (${llmConfig.provider}) 与模型 ID (${modelId}) 不匹配。请检查配置。`;
        console.error(`[LLM Config] ${errorMsg}`);
        throw new Error(errorMsg);
    }
}

// --- Get Model Options Function ---
/**
 * Gets generation options (maxTokens, temperature) for a given model name.
 * Reads defaults from environment variables (LLM_SEARCH_DEFAULT_...).
 * Allows for model-specific overrides via environment variables (e.g., LLM_SEARCH_GPT4OMINI_MAX_TOKENS).
 * @param modelId - The identifier for the model (e.g., 'gemini-2.5-flash-preview-04-17-nothinking', 'gpt-4o', 'deepseek-chat').
 * @returns An object containing maxTokens and temperature.
 */
export function getModelOptions(modelId: string): { maxTokens: number; temperature: number } {
    // Construct model-specific env var names (uppercase, replace hyphens/dots with underscore)
    const modelEnvPrefix = `LLM_SEARCH_${modelId.toUpperCase().replace(/[-.]/g, '_')}_`;

    // Read model-specific overrides or fall back to general defaults
    const maxTokensStr = process.env[`${modelEnvPrefix}MAX_TOKENS`] || process.env.LLM_SEARCH_DEFAULT_MAX_TOKENS;
    const temperatureStr = process.env[`${modelEnvPrefix}TEMPERATURE`] || process.env.LLM_SEARCH_DEFAULT_TEMPERATURE;

    // Determine fallback defaults if general defaults are also missing
    let defaultMaxTokens = 4096; // General default
    let defaultTemperature = 0.5; // General default
    if (modelId.startsWith('gemini')) {
        defaultMaxTokens = 8192;
        defaultTemperature = 0.4;
    } else if (modelId.startsWith('gpt-4o-mini')) {
        defaultMaxTokens = 4096;
        defaultTemperature = 0.5;
    } else if (modelId.startsWith('deepseek')) { // Add defaults for DeepSeek
        defaultMaxTokens = 8192; // Adjust based on DeepSeek model capabilities
        defaultTemperature = 0.6; // Adjust based on typical DeepSeek usage
    }
    // Add defaults for other models

    const maxTokens = parseInt(maxTokensStr || defaultMaxTokens.toString(), 10);
    const temperature = parseFloat(temperatureStr || defaultTemperature.toString());

    // Basic validation
    const finalMaxTokens = isNaN(maxTokens) || maxTokens <= 0 ? defaultMaxTokens : maxTokens;
    const finalTemperature = isNaN(temperature) || temperature < 0 || temperature > 2 ? defaultTemperature : temperature;

    console.log(`[LLM Config] Options for ${modelId}: maxTokens=${finalMaxTokens}, temperature=${finalTemperature}`);
    return { maxTokens: finalMaxTokens, temperature: finalTemperature };
}

// --- Knowledge Cutoff ---
/**
 * Knowledge cutoff date for the LLM, read from environment variable.
 * Note: This might need adjustment depending on the actual model used.
 */
export const KNOWLEDGE_CUTOFF = process.env.LLM_SEARCH_KNOWLEDGE_CUTOFF || 'October 2023'; // Default cutoff - Update if using models with different cutoffs