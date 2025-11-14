/**
 * LLM-based Search Simulator Library
 *
 * This library uses a Large Language Model to generate simulated
 * search engine results based on a provided query.
 */

// Export the main search function
export { searchSimulator } from './search';

// Export relevant types for consumers of the library
export type { SearchParams, SearchResponse, SearchResult } from './types';
export type { LLMConfig } from './search';

// Export constants if they need to be used externally
export { KNOWLEDGE_CUTOFF } from './config'; 