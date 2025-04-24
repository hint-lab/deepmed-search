'use server';

import { z } from 'zod';
// Import the necessary functions
import { searchSimilarChunks } from '@/lib/pgvector/operations';
import { getEmbedding } from '@/lib/openai/embedding';

// Define the structure for a single chunk result
export interface ChunkResult {
    id: string;
    text: string; // The actual text content of the chunk
    score: number; // Relevance score from the search
    source?: string; // Optional: source document name/ID
    metadata?: Record<string, any>; // Optional: other metadata
}

// Define the options type for the action, including kbId
interface KbSearchOptions {
    topK?: number;
    kbId?: string; // Add kbId here
}

// Define the schema for the action input, adding kbId validation
const KbSearchInputSchema = z.object({
    query: z.string().min(1, "Query cannot be empty."),
    kbId: z.string().min(1, "Knowledge base ID is required."), // Make kbId required
    topK: z.number().int().positive().optional().default(5),
});

/**
 * Server Action to perform knowledge base chunk search using embeddings and pgvector.
 * @param query The search query string.
 * @param options Optional parameters including topK and kbId.
 * @returns An object containing success status and data (ChunkResult[]) or error message.
 */
export async function performKbSearchAction(
    query: string,
    options?: KbSearchOptions // Use the updated options type
): Promise<{ success: boolean; data?: ChunkResult[]; error?: string }> {
    try {
        // Validate input, including kbId
        const validation = KbSearchInputSchema.safeParse({ query, ...options });
        if (!validation.success) {
            console.error("[KB Action] Invalid input:", validation.error.format());
            // Provide more specific error based on validation if needed
            return { success: false, error: validation.error.errors.map(e => e.message).join(' ') || "Invalid search parameters." };
        }

        const { query: validatedQuery, topK, kbId } = validation.data;

        console.log(`[KB Action] Performing search for query: "${validatedQuery}" in KB ID: ${kbId} with topK: ${topK}`);

        // 1. Generate embedding for the single query string using getEmbedding
        console.log("[KB Action] Generating embedding for query...");
        // @ts-ignore // Temporarily ignore potential linter issue
        const queryEmbedding = await getEmbedding(validatedQuery, 'text-embedding-3-small');
        console.log("[KB Action] Embedding generated.");

        // 2. Search for similar chunks in the specified knowledge base
        console.log(`[KB Action] Searching similar chunks in vector DB for kbId: ${kbId}...`);
        const similarChunks = await searchSimilarChunks(queryEmbedding, kbId, topK);
        console.log(`[KB Action] Found ${similarChunks.length} similar chunks.`);

        // 3. Map the results to the ChunkResult format
        const results: ChunkResult[] = similarChunks.map(chunk => ({
            id: chunk.chunk_id,
            text: chunk.content,
            score: chunk.distance,
            source: chunk.doc_name,
            metadata: {
                doc_id: chunk.doc_id,
            }
        }));

        return { success: true, data: results };

    } catch (error: any) {
        console.error("[KB Action] Error performing KB search:", error);
        // Provide more specific error messages if possible
        let errorMessage = "An unexpected error occurred during knowledge base search.";
        if (error instanceof Error) { // Check if it's an Error object
            if (error.message.includes('embedding')) {
                errorMessage = "Failed to generate embeddings for the query.";
            } else if (error.message.includes('vector search')) { // Adapt based on actual errors
                errorMessage = "Failed to search the knowledge base.";
            } else {
                errorMessage = error.message;
            }
        } else {
            errorMessage = String(error); // Handle non-Error objects
        }
        return {
            success: false,
            error: errorMessage
        };
    }
}
