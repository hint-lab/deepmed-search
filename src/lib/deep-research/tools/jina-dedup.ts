import { TokenTracker } from "../utils/token-tracker";
import { cosineSimilarity } from "./cosine";
import { getEmbeddings } from "./embeddings";

const SIMILARITY_THRESHOLD = 0.86; // Adjustable threshold for cosine similarity


export async function dedupQueries(
  newQueries: string[],
  existingQueries: string[],
  tracker?: TokenTracker
): Promise<{ unique_queries: string[] }> {
  try {
    // Quick return for single new query with no existing queries
    if (newQueries?.length === 1 && (!existingQueries || existingQueries.length === 0)) {
      return {
        unique_queries: newQueries,
      };
    }

    // Ensure arrays are valid before proceeding
    if (!newQueries || !existingQueries) {
      console.error("[dedupQueries] Error: Input arrays cannot be null/undefined.");
      return { unique_queries: newQueries || [] }; // Return new queries or empty if newQueries is also invalid
    }

    // Get embeddings for all queries in one batch
    const combinedQueries = [...newQueries, ...existingQueries];
    const { embeddings: allEmbeddings } = await getEmbeddings(combinedQueries, tracker);

    // If embeddings is empty (due to 402 error), return all new queries
    if (!allEmbeddings.length) {
      return {
        unique_queries: newQueries,
      };
    }

    // Split embeddings back into new and existing
    const newEmbeddings = allEmbeddings.slice(0, newQueries.length);
    const existingEmbeddings = allEmbeddings.slice(newQueries.length);

    const uniqueQueries: string[] = [];
    const usedIndices = new Set<number>();

    // Compare each new query against existing queries and already accepted queries
    for (let i = 0; i < newQueries.length; i++) {
      let isUnique = true;

      // Check against existing queries
      for (let j = 0; j < existingQueries.length; j++) {
        const similarity = cosineSimilarity(newEmbeddings[i], existingEmbeddings[j]);
        if (similarity >= SIMILARITY_THRESHOLD) {
          isUnique = false;
          break;
        }
      }

      // Check against already accepted queries
      if (isUnique) {
        for (const usedIndex of usedIndices) {
          const similarity = cosineSimilarity(newEmbeddings[i], newEmbeddings[usedIndex]);
          if (similarity >= SIMILARITY_THRESHOLD) {
            isUnique = false;
            break;
          }
        }
      }

      // Add to unique queries if passed all checks
      if (isUnique) {
        uniqueQueries.push(newQueries[i]);
        usedIndices.add(i);
      }
    }
    console.log('Dedup:', uniqueQueries);
    return {
      unique_queries: uniqueQueries,
    };
  } catch (error) {
    console.error('Error in deduplication analysis:', error);

    // return all new queries if there is an error
    return {
      unique_queries: newQueries,
    };
  }
}
