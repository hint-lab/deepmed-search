import { StandardSearchResult } from './common';

/**
 * Calls the Jina Search API (s.jina.ai).
 * Designed to be called from server-side code.
 *
 * @param query The search query.
 * @param apiKey Optional Jina API key for higher limits.
 * @returns A promise that resolves to an array of StandardSearchResult.
 * @throws An error if the API call fails.
 */
export async function searchJina(query: string, apiKey?: string): Promise<StandardSearchResult[]> {
    if (!query || query.trim() === '') {
        throw new Error('Search query cannot be empty.');
    }

    // Encode the query for the URL path
    const encodedQuery = encodeURIComponent(query);
    const url = `https://s.jina.ai/${encodedQuery}`;

    console.log(`[Lib:Jina] Performing search for query: "${query}" at ${url}`);

    const headers: HeadersInit = {
        'Accept': 'application/json', // Crucial for getting JSON response
    };

    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        console.log('[Lib:Jina] Using API Key.');
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Lib:Jina] API error: ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`Jina API request failed with status: ${response.status}`);
        }

        const data = await response.json();

        // --- IMPORTANT: Adjust based on actual Jina JSON structure --- //
        // Assuming the response has a 'data' array based on common patterns
        // You MUST inspect the actual JSON response and adjust the mapping below.
        if (!data || !Array.isArray(data.data)) {
            console.warn('[Lib:Jina] Unexpected response structure:', data);
            return []; // Return empty if structure is not as expected
        }

        const results: StandardSearchResult[] = data.data.map((item: any) => ({
            title: item.title || 'No Title',
            url: item.url || '#',
            description: item.description || item.content || 'No description available.', // Check for 'description' or 'content'
            source: 'jina',
        }));
        // --- End Structure Adjustment --- //

        console.log(`[Lib:Jina] Search returned ${results.length} results.`);
        return results;

    } catch (error: any) {
        console.error('[Lib:Jina] Error during API call:', error);
        // Re-throw the error to be handled by the calling action
        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error('An unknown error occurred during Jina search.');
        }
    }
}
