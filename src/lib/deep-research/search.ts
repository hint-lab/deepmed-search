import { SEARCH_PROVIDER, STEP_SLEEP } from './config';
import { SafeSearchType, search as duckSearch } from "duck-duck-scrape";
import { search } from "./tools/jina-search";
import { serperSearch } from './tools/serper-search';
import { sleep } from './utils/common';
import { TrackerContext, KnowledgeItem, SearchSnippet, UnNormalizedSearchSnippet, SERPQuery, WebContent } from './types';
import { Schemas } from './utils/schemas';
import { normalizeUrl, addToAllURLs } from './utils/url-tools';
import { removeHTMLtags } from './utils/text-tools';
import { formatDateRange } from './utils/date-tools';

// 执行搜索查询
export async function executeSearchQueries(
    keywordsQueries: any[],
    context: TrackerContext,
    allURLs: Record<string, SearchSnippet>,
    SchemaGen: Schemas,
    webContents: Record<string, WebContent>,
    onlyHostnames?: string[]
): Promise<{
    newKnowledge: KnowledgeItem[],
    searchedQueries: string[]
}> {
    const uniqQOnly = keywordsQueries.map(q => q.q);
    const newKnowledge: KnowledgeItem[] = [];
    const searchedQueries: string[] = [];
    context.actionTracker.trackThink('search_for', SchemaGen.languageCode, { keywords: uniqQOnly.join(', ') });
    let utilityScore = 0;

    for (const query of keywordsQueries) {
        let results: UnNormalizedSearchSnippet[] = [];
        const oldQuery = query.q;
        if (onlyHostnames && onlyHostnames.length > 0) {
            query.q = `${query.q} site:${onlyHostnames.join(' OR site:')}`;
        }

        try {
            console.log('Search query:', query);
            switch (SEARCH_PROVIDER) {
                case 'jina':
                    results = (await search(query.q, context.tokenTracker)).response?.data || [];
                    break;
                case 'duck':
                    results = (await duckSearch(query.q, { safeSearch: SafeSearchType.STRICT })).results;
                    break;
                default:
                    results = [];
            }

            if (results.length === 0) {
                throw new Error('No results found');
            }
        } catch (error) {
            console.error(`${SEARCH_PROVIDER} search failed for query:`, query, error);
            continue;
        } finally {
            await sleep(STEP_SLEEP);
        }

        const minResults: SearchSnippet[] = results
            .map(r => {
                const url = normalizeUrl('url' in r ? r.url! : r.link!);
                if (!url) return null;

                return {
                    title: r.title,
                    url,
                    description: ('description' in r ? r.description : r.snippet) || '',
                    weight: 1,
                    date: r.date,
                } as SearchSnippet;
            })
            .filter(Boolean) as SearchSnippet[];

        minResults.forEach(r => {
            utilityScore = utilityScore + addToAllURLs(r, allURLs);
            webContents[r.url] = {
                title: r.title,
                full: r.description,
                chunks: [r.description],
                chunk_positions: [[0, r.description?.length || 0]],
            }
        });

        searchedQueries.push(query.q)

        newKnowledge.push({
            question: `What do Internet say about "${oldQuery}"?`,
            answer: removeHTMLtags(minResults.map(r => r.description).join('; ')),
            type: 'side-info',
            updated: query.tbs ? formatDateRange(query) : undefined
        });
    }

    if (searchedQueries.length === 0) {
        if (onlyHostnames && onlyHostnames.length > 0) {
            console.log(`No results found for queries: ${uniqQOnly.join(', ')} on hostnames: ${onlyHostnames.join(', ')}`);
            context.actionTracker.trackThink('hostnames_no_results', SchemaGen.languageCode, { hostnames: onlyHostnames.join(', ') });
        }
    } else {
        console.log(`Utility/Queries: ${utilityScore}/${searchedQueries.length}`);
    }

    return {
        newKnowledge,
        searchedQueries
    };
} 