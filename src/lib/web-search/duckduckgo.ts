import { search, SafeSearchType } from 'duck-duck-scrape';
import { StandardSearchResult } from './common'; // Import the standard interface


// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Performs a DuckDuckGo search using the duck-duck-scrape npm package.
 * Includes retry logic for VQD errors. Designed for server-side use.
 *
 * @param query The search query string.
 * @param maxRetries Maximum number of retries on VQD failure.
 * @param retryDelay Delay between retries in ms.
 * @returns A promise that resolves to an array of StandardSearchResult. // Updated return type
 * @throws An error if the search fails after retries.
 */
export async function searchDuckDuckGo(
    query: string,
    maxRetries = 2,
    retryDelay = 500
): Promise<StandardSearchResult[]> { // Updated return type
    if (!query || query.trim() === '') {
        throw new Error('Search query cannot be empty.');
    }

    console.log(`[Lib:DDG] Performing search for: "${query}"`);

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            const searchResults = await search(query, {
                safeSearch: SafeSearchType.STRICT,
            });

            if (searchResults.noResults) {
                console.log('[Lib:DDG] Search returned no results.');
                return []; // Return empty array for no results
            }

            // Map the DuckDuckGo response to StandardSearchResult
            const formattedResults: StandardSearchResult[] = searchResults.results.map((r: any) => ({ // Map to standard interface
                title: r.title || 'No Title',
                description: r.description || 'No Description',
                url: r.url || '#',
                source: 'duckduckgo', // Add source identifier
                // Optional: map hostname/icon if needed in standard interface
                // hostname: r.hostname,
                // icon: r.icon,
            }));

            console.log(`[Lib:DDG] Search (attempt ${attempt}) returned ${formattedResults.length} results.`);
            return formattedResults; // Success, return standardized results

        } catch (error: any) {
            console.error(`[Lib:DDG] Error during search (attempt ${attempt}):`, error);

            if (attempt <= maxRetries && error.message?.includes('Failed to get the VQD')) {
                console.log(`[Lib:DDG] VQD fetch failed, retrying in ${retryDelay}ms... (${attempt}/${maxRetries})`);
                await delay(retryDelay);
                continue; // Retry
            } else {
                throw error; // Re-throw other errors or final VQD error
            }
        }
    }
    throw new Error('DuckDuckGo search failed after all VQD retry attempts.');
} 