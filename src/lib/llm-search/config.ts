import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createDeepSeek } from '@ai-sdk/deepseek';
// Import other provider creators if needed:
// import { createAnthropic } from '@ai-sdk/anthropic';
// import { createVertex } from '@ai-sdk/google-vertex';
import { LanguageModelV1 } from '@ai-sdk/provider';


// --- Define Provider Types ---
type GoogleProviderType = ReturnType<typeof createGoogleGenerativeAI>;
type OpenAIProviderType = ReturnType<typeof createOpenAI>;
type DeepSeekProviderType = ReturnType<typeof createDeepSeek>;
// Define types for other providers if needed

// --- Provider Instances (Lazy initialization might be better if many providers) ---
// We create them here but only if the corresponding API key exists.

let google: GoogleProviderType | null = null;
if (process.env.GEMINI_API_KEY) {
    google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY, baseURL: process.env.GEMINI_BASE_URL });
    console.log('[LLM Config] Google AI Provider initialized.');
} else {
    console.warn('[LLM Config] GEMINI_API_KEY not found, Google AI Provider not initialized.');
}

let openai: OpenAIProviderType | null = null;
if (process.env.OPENAI_API_KEY) {
    const apiKey = process.env.OPENAI_API_KEY;
    // Use OPENAI_API_BASE from environment, fallback to default OpenAI URL is handled by the SDK if undefined
    const baseURL = process.env.OPENAI_API_BASE;
    console.log(`[LLM Config] Initializing OpenAI Provider with baseURL: ${baseURL || 'Default (api.openai.com/v1)'}`);
    openai = createOpenAI({
        apiKey: apiKey,
        baseURL: baseURL, // Pass the baseURL (SDK handles default if undefined)
    });
    console.log('[LLM Config] OpenAI Provider initialized.');
} else {
    console.warn('[LLM Config] OPENAI_API_KEY not found, OpenAI Provider not initialized.');
}

// --- Add DeepSeek Provider ---
let deepseek: DeepSeekProviderType | null = null; // Reuse OpenAI provider type
if (process.env.DEEPSEEK_API_KEY) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    // Default DeepSeek API Base URL (ensure this is correct)
    const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
    console.log(`[LLM Config] Initializing DeepSeek Provider (via OpenAI SDK) with baseURL: ${baseURL}`);
    deepseek = createDeepSeek({ // Use createOpenAI
        apiKey: apiKey,
        baseURL: baseURL,
        // You might need to add compatibility headers if required by DeepSeek
        // headers: { 'Your-Custom-Header': 'value' }
    });
    console.log('[LLM Config] DeepSeek Provider initialized.');
} else {
    console.warn('[LLM Config] DEEPSEEK_API_KEY not found, DeepSeek Provider not initialized.');
}


// Add other providers similarly...
// let anthropic: Anthropic | null = null;
// if (process.env.ANTHROPIC_API_KEY) { ... }

// --- Get Model Instance Function ---
/**
 * Gets an initialized AI SDK LanguageModelV1 instance based on the model ID.
 * Reads required API keys from environment variables.
 * Throws an error if the required provider/key is not configured.
 * @param modelId - The identifier for the model (e.g., 'gemini-1.5-flash-latest', 'gpt-4o-mini', 'deepseek-chat').
 * @returns An initialized LanguageModelV1 instance.
 */
export function getModelInstance(modelId: string): LanguageModelV1 {
    console.log(`[LLM Config] Requesting model instance for: ${modelId}`);

    if (modelId.startsWith('gemini')) {
        if (!google) {
            throw new Error('GEMINI_API_KEY is not set for Google AI, cannot get Gemini model instance.');
        }
        // Add specific logic for Vertex AI if needed, checking for GCLOUD_PROJECT etc.
        // if (process.env.GCLOUD_PROJECT && modelId.includes('vertex-specific-name?')) { ... }
        console.log(`[LLM Config] Providing Google AI model: ${modelId}`);
        return google(modelId as any); // Cast needed for specific IDs
    } else if (modelId.startsWith('gpt-')) {
        if (!openai) {
            throw new Error('OPENAI_API_KEY is not set, cannot get OpenAI model instance.');
        }
        console.log(`[LLM Config] Providing OpenAI model: ${modelId}`);
        return openai(modelId as any); // Cast needed
    } else if (modelId.startsWith('deepseek')) { // Handle DeepSeek models
        if (!deepseek) {
            throw new Error('DEEPSEEK_API_KEY is not set, cannot get DeepSeek model instance.');
        }
        console.log(`[LLM Config] Providing DeepSeek model: ${modelId}`);
        return deepseek(modelId as any); // Cast needed
    }
    // Add cases for other providers based on modelId prefixes or names
    /* else if (modelId.startsWith('claude-')) {
        if (!anthropic) {
            throw new Error('ANTHROPIC_API_KEY is not set, cannot get Anthropic model instance.');
        }
        console.log(`[LLM Config] Providing Anthropic model: ${modelId}`);
        return anthropic(modelId as any);
    } */
    else {
        console.error(`[LLM Config] No configured provider found for model ID: ${modelId}`);
        throw new Error(`Unsupported or unconfigured model ID: ${modelId}. Ensure the correct API key environment variable is set.`);
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

console.log(`[LLM Config] Default knowledge cutoff set to: ${KNOWLEDGE_CUTOFF}`);