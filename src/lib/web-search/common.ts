/**
 * Standardized interface for search results returned by library functions.
 */
export interface StandardSearchResult {
    title: string;
    url: string; // Use 'url' as the standard link field name
    description: string; // Use 'description' as the standard snippet/content field name
    source: 'tavily' | 'duckduckgo' | 'jina' | 'unknown'; // Identifier for the search engine
    // Optional: Add other potentially common fields if needed later
    // score?: number;
    // hostname?: string;
    // icon?: string;
}