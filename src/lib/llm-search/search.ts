import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
// Add other providers if needed: import { createAnthropic } from '@ai-sdk/anthropic';
import { LanguageModelV1 } from '@ai-sdk/provider';

import { SearchParams, SearchResponse, SearchResult, zSearchParams } from './types';
import { ObjectGeneratorSafe } from './tools';
import { getModelInstance, getModelOptions, KNOWLEDGE_CUTOFF } from './config';
import { generateId } from 'ai';

// Helper function to get model instance based on name and env vars
// This function *must* run server-side only.


// --- Define the Search Result Schema ---
// Define the schema for a single search result item
const SearchResultItemSchema = z.object({
    rank: z.number().int().positive().describe('结果的排名 (从 1 开始)'),
    title: z.string().describe('网页标题'),
    url: z.string().url().describe('网页链接'),
    snippet: z.string().describe('内容摘要或片段'),
    // Add other fields if they exist in your original array item schema
});

// Define the main schema for the LLM output, wrapping the array in an object
const LlmOutputSchema = z.object({
    searchResults: z.array(SearchResultItemSchema)
        .describe('生成的搜索结果列表，按相关性排序')
        .min(5) // Optional: Ensure at least 5 results
        .max(15), // Optional: Limit the number of results
    // You could add other top-level fields here if needed, like summary, related questions etc.
    // summary: z.string().optional().describe('对搜索结果的简短总结'),
});

// --- searchSimulator Function ---
export async function searchSimulator(query: string, model: string, userId?: string | null): Promise<SearchResult[]> {
    // Map the short model name from options to the full model ID
    const modelMapping: { [key: string]: string } = {
        'gemini': 'gemini-2.5-flash-preview-04-17-nothinking',
        'gpt': 'gpt-4o',
        'deepseek': 'deepseek-chat'
    };

    // Use the provided model short name to get the full ID, or use a default if not found/invalid
    // Choose a sensible default, maybe Gemini?
    const modelId = (model && modelMapping[model]) ? modelMapping[model] : 'gemini-2.5-flash-preview-04-17-nothinking';
    console.log(`[LLM Search Lib] Received short model: ${model}, Mapped to modelId: ${modelId}`); // Add logging

    const { maxTokens, temperature } = getModelOptions(modelId);
    const modelInstance = await getModelInstance(modelId, userId);
    const objectGenerator = new ObjectGeneratorSafe();

    const systemPrompt = `You are an advanced AI search engine simulator. Your task is to generate a realistic search engine results page (SERP) for a given query. Generate a list of search results based on the query: "${query}".
    Return exactly the requested JSON object containing the search results array. Do not add any conversational text or markdown formatting before or after the JSON.
    Focus on relevance, diversity of sources (if applicable), and realistic titles and snippets. The current year is ${new Date().getFullYear()}. Knowledge cutoff: ${KNOWLEDGE_CUTOFF}.`;

    // Ensure the prompt clearly asks for the structure defined in LlmOutputSchema
    const userPrompt = `Generate search results for the query: "${query}". Please provide the results in the specified JSON format with a 'searchResults' array containing objects with rank, title, url, and snippet.`;

    console.log(`[LLM Search Lib] Generating search results for query: "${query}" using model ${modelId}`);

    try {
        const generationResult = await objectGenerator.generateObject({
            modelInstance,
            schema: LlmOutputSchema, // <--- 使用包装后的 LlmOutputSchema
            prompt: userPrompt,
            system: systemPrompt,
            maxTokens,
            temperature,
        });

        console.log("[LLM Search Lib] Raw generation result:", generationResult);

        // Extract the array from the generated object
        const resultsArray = generationResult.object.searchResults;

        // Map the generated objects to the SearchResult type if necessary
        // (Assuming SearchResult type matches SearchResultItemSchema structure)
        const searchResults: SearchResult[] = resultsArray.map(item => {
            let domain = '';
            try {
                domain = new URL(item.url).hostname.replace(/^www\./, '');
            } catch (e) {
                console.warn(`[LLM Search Lib] Failed to parse domain from URL: ${item.url}`);
            }
            // Ensure the mapping matches the structure of SearchResult from ./types
            return {
                id: generateId(),
                title: item.title,
                link: item.url, // Map url to link
                snippet: item.snippet,
                position: item.rank, // Map rank to position
                domain: domain, // Extract domain from URL
                score: 1 / item.rank, // Optional score calculation
                // Add other fields required by SearchResult from ./types if any
            };
        });


        console.log(`[LLM Search Lib] Successfully generated ${searchResults.length} search results.`);
        return searchResults;

    } catch (error) {
        console.error("[LLM Search Lib] Failed to generate search results:", error);
        if (error instanceof Error) {
            // Throwing the original error might give more context from the SDK
            // throw new Error(`LLM Search generation failed: ${error.message}`);
            throw error;
        }
        throw new Error("An unknown error occurred during LLM search generation.");
    }
}

// Optional: Default export if preferred, but named export is fine too
// export default searchSimulator;

// Assuming 'model' holds the short name like 'gemini', 'gpt', or 'deepseek' from options
export async function performLlmSearch(query: string, options?: { model?: string; userId?: string | null;[key: string]: any }): Promise<SearchResult[]> {
    const model = options?.model; // Extract the short model name
    const userId = options?.userId; // Extract the user ID

    // Map the short model name from options to the full model ID
    const modelMapping: { [key: string]: string } = {
        'gemini': 'gemini-2.5-flash-preview-04-17-nothinking',
        'gpt': 'gpt-4o',
        'deepseek': 'deepseek-chat'
    };

    // Use the provided model short name to get the full ID, or use a default if not found/invalid
    // Choose a sensible default, maybe Gemini?
    const modelId = (model && modelMapping[model]) ? modelMapping[model] : 'gemini-2.5-flash-preview-04-17-nothinking';
    console.log(`[LLM Search Lib] Received short model: ${model}, Mapped to modelId: ${modelId}`); // Add logging

    // Call searchSimulator with the query, the resolved modelId, and userId
    return searchSimulator(query, modelId, userId);

    // Remove the placeholder code below if it existed
    // const provider = getLlmProvider(modelId); // Example: Assuming you have a function to get the provider
    // Example: provider.generate(...) or similar call using the resolved modelId
    // ... rest of the function uses modelId ...
}