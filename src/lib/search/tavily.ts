import { StandardSearchResult } from './common'; // Import the standard interface

/**
 * Calls the Tavily Search API.
 * Designed to be called from server-side code (Server Actions, API Routes)
 * which handles API key retrieval from environment variables.
 *
 * @param query The search query.
 * @param apiKey The Tavily API key.
 * @returns A promise that resolves to an array of StandardSearchResult.
 * @throws An error if the API call fails.
 */
export async function searchTavily(query: string, apiKey: string): Promise<StandardSearchResult[]> {
    if (!apiKey) {
        throw new Error('Tavily API key is required.');
    }
    if (!query || query.trim() === '') {
        throw new Error('Search query cannot be empty.');
    }

    console.log(`[Lib:Tavily] Performing search for query: "${query}"`);

    const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            api_key: apiKey,
            query: query,
            search_depth: "basic",
            include_answer: false,
            include_images: false,
            include_raw_content: false,
            max_results: 30,
        }),
        cache: 'no-store'
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[Lib:Tavily] API error: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`Tavily API request failed with status: ${response.status}`);
    }

    const data = await response.json();

    // Map the Tavily response to StandardSearchResult
    const results: StandardSearchResult[] = data.results?.map((item: any) => ({
        title: item.title || 'No Title',
        url: item.url || '#',
        description: item.content || 'No snippet available.',
        source: 'tavily',
    })) || [];

    console.log(`[Lib:Tavily] Search returned ${results.length} results.`);
    return results;
} 