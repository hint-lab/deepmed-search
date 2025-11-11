import axios from 'axios';
import { TokenTracker } from "../utils/token-tracker";
import { getJinaApiKey } from "../user-context";

const JINA_API_URL = 'https://api.jina.ai/v1/rerank';

// Types for Jina Rerank API
interface JinaRerankRequest {
  model: string;
  query: string;
  top_n: number;
  documents: string[];
}

interface JinaRerankResponse {
  model: string;
  results: Array<{
    index: number;
    document: {
      text: string;
    };
    relevance_score: number;
  }>;
  usage: {
    total_tokens: number;
  };
}

export async function rerankDocuments(
  query: string,
  documents: string[],
  tracker?: TokenTracker,
  batchSize = 2000
): Promise<{ results: Array<{ index: number, relevance_score: number, document: { text: string } }> }> {
  try {
    const jinaApiKey = getJinaApiKey(); // 从用户上下文获取
    if (!jinaApiKey) {
      console.warn('JINA_API_KEY is not set, skipping rerank');
      return { results: [] };
    }

    if (documents.length === 0) {
      return { results: [] };
    }

    // No need to slice - we'll process all documents in batches
    const batches: string[][] = [];
    for (let i = 0; i < documents.length; i += batchSize) {
      batches.push(documents.slice(i, i + batchSize));
    }

    console.log(`Rerank ${documents.length} documents in ${batches.length} batches of up to ${batchSize} each`);

    // Process all batches with individual error handling
    const batchResults = await Promise.all(
      batches.map(async (batchDocuments, batchIndex) => {
        const startIdx = batchIndex * batchSize;
        const taskId = tracker ? (tracker as any).taskId || 'unknown' : 'unknown';
        try {
          const request: JinaRerankRequest = {
            model: 'jina-reranker-v2-base-multilingual',
            query,
            top_n: batchDocuments.length,
            documents: batchDocuments
          };

          const response = await axios.post<JinaRerankResponse>(
            JINA_API_URL,
            request,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jinaApiKey}`
              },
              timeout: 30000 // 30 second timeout
            }
          );

          // Track token usage from this batch
          const tokenTracker = new TokenTracker(taskId);
          tokenTracker.trackUsage('rerank', {
            promptTokens: response.data.usage.total_tokens,
            completionTokens: 0,
            totalTokens: response.data.usage.total_tokens
          });

          // Add the original document index to each result
          return response.data.results.map(result => ({
            ...result,
            originalIndex: startIdx + result.index // Map back to the original index
          }));
        } catch (batchError) {
          // Log batch error but continue with other batches
          if (axios.isAxiosError(batchError)) {
            console.error(`Error reranking batch ${batchIndex + 1}/${batches.length}:`, {
              status: batchError.response?.status,
              statusText: batchError.response?.statusText,
              data: batchError.response?.data,
              message: batchError.message
            });
          } else {
            console.error(`Error reranking batch ${batchIndex + 1}/${batches.length}:`, batchError);
          }
          // Return empty array for this batch so other batches can succeed
          return [];
        }
      })
    );

    // Flatten and sort all results by relevance score
    const allResults = batchResults.flat().filter(r => r !== null && r !== undefined);

    if (allResults.length === 0) {
      console.warn('No documents were successfully reranked');
      return { results: [] };
    }

    allResults.sort((a, b) => b.relevance_score - a.relevance_score);

    // Keep the original document indices in the results
    const finalResults = allResults.map(result => ({
      index: result.originalIndex,       // Original document index
      relevance_score: result.relevance_score,
      document: result.document
    }));

    console.log(`Successfully reranked ${finalResults.length}/${documents.length} documents`);
    return { results: finalResults };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error in reranking documents:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('Error in reranking documents:', error);
    }

    // Return empty results if there is an error
    return {
      results: []
    };
  }
}