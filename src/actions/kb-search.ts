'use server';

import { z } from 'zod';
// Import the necessary functions
import { searchSimilarChunks, ChunkSearchResult } from '@/lib/milvus/operations';
import { getEmbedding } from '@/lib/llm-provider';

export interface ChunkResult {
    id: string;
    text: string;
    score: number;
    source?: string;
    metadata?: {
        doc_id: string;
        page?: number;
        bm25_similarity?: number;
        vector_similarity?: number;
        [key: string]: any;
    };
}

// Define the options type for the action, including kbId and mode
interface KbSearchOptions {
    topK?: number;
    kbId?: string;
    mode?: 'vector' | 'bm25' | 'hybrid'; // 新增
    bm25Weight?: number;
    vectorWeight?: number;
}

// Define the schema for the action input, adding kbId and mode validation
const KbSearchInputSchema = z.object({
    query: z.string().min(1, "Query cannot be empty."),
    kbId: z.string().min(1, "Knowledge base ID is required."),
    topK: z.number().int().positive().optional().default(5),
    mode: z.enum(['vector', 'bm25', 'hybrid']).optional().default('vector'), // 新增
    bm25Weight: z.number().optional().default(0.5),
    vectorWeight: z.number().optional().default(0.5),
});

/**
 * Server Action to perform knowledge base chunk search using embeddings and pgvector.
 * @param query The search query string.
 * @param options Optional parameters including topK and kbId.
 * @returns An object containing success status and data (ChunkResult[]) or error message.
 */
export async function performKbSearchAction(
    query: string,
    options?: KbSearchOptions
): Promise<{ success: boolean; data?: ChunkResult[]; error?: string }> {
    try {
        // Validate input, including kbId and mode
        const validation = KbSearchInputSchema.safeParse({ query, ...options });
        if (!validation.success) {
            console.error("[KB Action] Invalid input:", validation.error.format());
            // Provide more specific error based on validation if needed
            return { success: false, error: validation.error.errors.map(e => e.message).join(' ') || "Invalid search parameters." };
        }

        const { query: validatedQuery, topK, kbId, mode } = validation.data;

        console.log(`[KB Action] Performing search for query: "${validatedQuery}" in KB ID: ${kbId} with topK: ${topK} and mode: ${mode}`);

        // 1. Generate embedding for the single query string using getEmbedding
        console.log("[KB Action] Generating embedding for query...");
        let queryEmbedding: number[] = [];
        if (mode !== 'bm25') {
            // 只有向量/混合检索时才生成 embedding
            queryEmbedding = await getEmbedding(validatedQuery, 'text-embedding-3-small');
        }
        console.log("[KB Action] Embedding generated.");

        // 2. Search for similar chunks in the specified knowledge base
        console.log(`[KB Action] Searching similar chunks in vector DB for kbId: ${kbId}...`);
        const similarChunks = await searchSimilarChunks({
            queryText: validatedQuery,
            queryVector: queryEmbedding,
            kbId,
            resultLimit: topK,
            bm25Weight: options?.bm25Weight,
            vectorWeight: options?.vectorWeight
        });
        console.log(`[KB Action] Found ${similarChunks.length} similar chunks.`);

        console.log(`[KB Action] Raw similar chunks:`, JSON.stringify(similarChunks.slice(0, 2), null, 2));

        // 3. Map the results to the ChunkResult format
        const results = similarChunks.map(chunk => {
            let score = 0;
            console.log(chunk.bm25_similarity, chunk.vector_similarity)
            if (mode === 'bm25') {
                score = chunk.bm25_similarity || 0;
            } else if (mode === 'vector') {
                score = chunk.vector_similarity || 0;
            } else { // hybrid
                // 混合模式，如果返回中有组合分数则使用
                score = chunk.similarity || 0;
            }

            return {
                id: chunk.chunk_id,
                text: chunk.content_with_weight,
                score: score,
                source: chunk.doc_name,
                metadata: {
                    doc_id: chunk.doc_id,
                    bm25_similarity: chunk.bm25_similarity || 0,
                    vector_similarity: chunk.vector_similarity || 0,
                }
            };
        });

        return { success: true, data: results };

    } catch (error: any) {
        console.error("[KB Action] Error performing KB search:", error);
        // 处理错误...
        return {
            success: false,
            error: "An unexpected error occurred during knowledge base search."
        };
    }
}
