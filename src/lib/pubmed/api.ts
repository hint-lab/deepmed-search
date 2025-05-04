import xml2js from 'xml2js';
import { PubMedArticle, PubMedSearchResult } from './types';

// Ensure xml2js is installed: npm install xml2js @types/xml2js
// You might need node-fetch if using an older Node.js version without global fetch
// import fetch from 'node-fetch';

const NCBI_API_KEY = process.env.NCBI_API_KEY; // Use environment variables for API keys
const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';

const parser = new xml2js.Parser({ explicitArray: false });

/**
 * 创建支持超时的AbortSignal (兼容服务器端)
 */
function createTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
    // 检查环境是否支持AbortSignal
    if (typeof AbortSignal === 'undefined') {
        console.warn('AbortSignal is not supported in this environment');
        return undefined;
    }

    // 检查是否支持timeout方法
    if (typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(timeoutMs);
    }

    // 如果不支持timeout方法，手动创建
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
}

/**
 * 从PubMed搜索文章 (支持分页)
 * @param term 搜索关键词
 * @param retmax 每页最大结果数量 (default: 10)
 * @param page 要获取的页码 (1-based, default: 1)
 * @returns PubMed搜索结果 (包含当前页的文章和总数)
 */
export async function searchPubMed(
    term: string,
    retmax: number = 10, // Default results per page
    page: number = 1     // Default to page 1
): Promise<PubMedSearchResult> {
    if (!term) {
        throw new Error('Search term cannot be empty');
    }
    if (page < 1) {
        page = 1; // Ensure page is at least 1
    }
    if (retmax < 1) {
        retmax = 10; // Ensure retmax is reasonable
    }

    // Calculate retstart (0-based index for the first record)
    const retstart = (page - 1) * retmax;

    console.log(`Searching PubMed for: "${term}", Page: ${page}, ResultsPerPage: ${retmax}, RetStart: ${retstart}`);

    // --- Step 1: ESearch - Still fetches basic info and total count ---
    // We still need the initial ESearch to get the WebEnv, QueryKey, and total count.
    // We *could* limit ESearch retmax, but getting the full ID list info once is often fine.
    const esearchUrl = new URL(`${EUTILS_BASE}esearch.fcgi`);
    esearchUrl.searchParams.set('db', 'pubmed');
    esearchUrl.searchParams.set('term', term);
    esearchUrl.searchParams.set('retmax', '0'); // Set retmax=0 initially to just get count and history
    esearchUrl.searchParams.set('usehistory', 'y');
    if (NCBI_API_KEY) {
        esearchUrl.searchParams.set('api_key', NCBI_API_KEY);
    }

    let esearchResultXml: string;
    let esearchData: any;
    let count = 0;
    let queryKey: string | undefined;
    let webEnv: string | undefined;

    try {
        // 使用修改后的timeout逻辑
        const timeoutSignal = createTimeoutSignal(20000); // 20秒超时

        // Fetch ESearch results
        const esearchRes = await fetch(esearchUrl.toString(), {
            headers: { 'Accept': 'application/xml, text/xml, */*' },
            ...(timeoutSignal ? { signal: timeoutSignal } : {})
        });

        if (!esearchRes.ok) {
            throw new Error(`ESearch request failed: ${esearchRes.status} ${esearchRes.statusText}`);
        }
        esearchResultXml = await esearchRes.text();
        console.log(`ESearch XML received (${esearchResultXml.length} bytes)`);

        // Parse ESearch XML
        esearchData = await parser.parseStringPromise(esearchResultXml);
        if (!esearchData.eSearchResult) {
            throw new Error('Invalid ESearch response format');
        }

        count = parseInt(esearchData.eSearchResult.Count || '0', 10);
        queryKey = esearchData.eSearchResult.QueryKey;
        webEnv = esearchData.eSearchResult.WebEnv;

        console.log(`ESearch found Total: ${count}, QueryKey: ${queryKey}, WebEnv: ${webEnv}`);

    } catch (error: any) {
        console.error('Error during ESearch processing:', error);
        throw new Error(`Failed to execute ESearch query: ${error.message}`);
    }

    // If no results found or no history info, return early
    if (count === 0 || !queryKey || !webEnv) {
        console.log('No results found or missing history info from ESearch.');
        return { articles: [], count: 0 };
    }

    // --- Step 2: ESummary - Fetch ONLY the requested page using history ---
    const esummaryUrl = `${EUTILS_BASE}esummary.fcgi`;
    const esummaryParams = new URLSearchParams();
    esummaryParams.set('db', 'pubmed');
    esummaryParams.set('query_key', queryKey); // Use QueryKey from ESearch
    esummaryParams.set('WebEnv', webEnv);     // Use WebEnv from ESearch
    esummaryParams.set('retmode', 'xml');
    esummaryParams.set('retstart', String(retstart)); // Use calculated retstart for pagination
    esummaryParams.set('retmax', String(retmax));     // Use retmax for results per page
    if (NCBI_API_KEY) {
        esummaryParams.set('api_key', NCBI_API_KEY);
    }

    // Retry logic for ESummary
    const MAX_RETRIES = 3;
    let retryCount = 0;
    let summaryResponse: Response | null = null;
    let summaryXmlText: string | null = null;

    while (retryCount < MAX_RETRIES && !summaryResponse) {
        retryCount++;
        try {
            console.log(`ESummary attempt #${retryCount} for page ${page} (retstart: ${retstart})`);

            // 使用修改后的timeout逻辑
            const timeoutSignal = createTimeoutSignal(30000); // 30秒超时

            // Try POST first (often preferred for ESummary with history)
            let response: Response | null = null;
            try {
                response = await fetch(esummaryUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/xml, text/xml, */*',
                    },
                    body: esummaryParams.toString(),
                    ...(timeoutSignal ? { signal: timeoutSignal } : {})
                });
            } catch (postError: any) {
                console.warn(`ESummary POST attempt #${retryCount} failed: ${postError.message}. Trying GET.`);
                // Fallback to GET if POST fails
                const getUrl = new URL(esummaryUrl);
                esummaryParams.forEach((value, key) => getUrl.searchParams.set(key, value));

                // 重新创建超时信号
                const getTimeoutSignal = createTimeoutSignal(30000);

                response = await fetch(getUrl.toString(), {
                    method: 'GET',
                    headers: { 'Accept': 'application/xml, text/xml, */*' },
                    ...(getTimeoutSignal ? { signal: getTimeoutSignal } : {})
                });
            }

            if (!response || !response.ok) {
                const status = response?.status || 'N/A';
                const statusText = response?.statusText || 'No response';
                let errorBody = response ? await response.text().catch(() => '') : '';
                console.warn(`ESummary attempt #${retryCount} failed: ${status} ${statusText}. Body (truncated): ${errorBody.substring(0, 200)}`);
                if (retryCount >= MAX_RETRIES) {
                    throw new Error(`ESummary failed after ${MAX_RETRIES} attempts with status ${status}`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1))); // Exponential backoff
                continue; // Go to next retry iteration
            }

            // Success, read XML
            summaryXmlText = await response.text();
            if (!summaryXmlText || summaryXmlText.trim().length === 0) {
                console.warn(`ESummary attempt #${retryCount} received empty response.`);
                if (retryCount >= MAX_RETRIES) {
                    throw new Error(`ESummary received empty response after ${MAX_RETRIES} attempts.`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
                continue; // Go to next retry iteration
            }

            summaryResponse = response; // Mark as success
            console.log(`ESummary XML received successfully on attempt #${retryCount} (${summaryXmlText.length} bytes)`);

        } catch (error: any) {
            console.error(`Error during ESummary fetch/retry logic (Attempt #${retryCount}):`, error);
            if (retryCount >= MAX_RETRIES) {
                throw new Error(`ESummary failed after ${MAX_RETRIES} attempts. Last error: ${error.message}`);
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
        }
    } // End while loop

    if (!summaryResponse || !summaryXmlText) {
        // This should theoretically not be reached if the loop logic is correct, but as a safeguard:
        throw new Error("Failed to get ESummary response after all retries.");
    }


    // --- Step 3: Process ESummary XML using xml2js ---
    let summaryData: any;
    try {
        summaryData = await parser.parseStringPromise(summaryXmlText);
    } catch (parseError) {
        console.error("Error parsing ESummary XML with xml2js:", parseError);
        console.log('Received XML (first 500 chars):', summaryXmlText.substring(0, 500));
        throw new Error('Failed to parse ESummary XML response (xml2js)');
    }

    // Check for API errors within the parsed XML
    if (summaryData.eSummaryResult && summaryData.eSummaryResult.ERROR) {
        const apiError = summaryData.eSummaryResult.ERROR;
        console.error("PubMed API Error (from ESummary XML):", apiError);
        throw new Error(`PubMed API Error in ESummary: ${typeof apiError === 'string' ? apiError : JSON.stringify(apiError)}`);
    }

    // Extract articles
    let docSums: any[] = [];
    if (summaryData.eSummaryResult && summaryData.eSummaryResult.DocSum) {
        docSums = Array.isArray(summaryData.eSummaryResult.DocSum)
            ? summaryData.eSummaryResult.DocSum
            : [summaryData.eSummaryResult.DocSum];
    } else {
        console.warn("No DocSum found in ESummary response for page", page);
    }


    const articles: PubMedArticle[] = docSums
        .map((docSum: any): PubMedArticle | null => {
            const getItemContent = (itemName: string): string => {
                // Simplified getItemContent for xml2js structure
                if (!docSum || !docSum.Item) return "";
                const items = Array.isArray(docSum.Item) ? docSum.Item : [docSum.Item];
                const targetItem = items.find((item: any) => item?.$?.Name === itemName);
                return targetItem?._ || "";
            };

            const getAuthors = (): string => {
                if (!docSum || !docSum.Item) return "";
                const items = Array.isArray(docSum.Item) ? docSum.Item : [docSum.Item];
                const authorListItem = items.find((item: any) => item?.$?.Name === 'AuthorList');
                if (!authorListItem || !authorListItem.Item) return "";
                const authorItems = Array.isArray(authorListItem.Item) ? authorListItem.Item : [authorListItem.Item];
                return authorItems
                    .filter((author: any) => author?.$?.Name === 'Author' && author._)
                    .map((author: any) => author._)
                    .join(", ");
            };

            const pmid = docSum.Id || "";

            if (!pmid) {
                console.warn("Skipping article due to missing PMID in DocSum:", docSum);
                return null;
            }

            return {
                pmid: pmid,
                title: getItemContent("Title") || "No Title",
                authors: getAuthors() || "No Authors",
                journal: getItemContent("FullJournalName") || getItemContent("Source") || "No Journal",
                pubdate: getItemContent("PubDate") || "No Date",
                // abstract is optional, so it's fine if missing
            };
        })
        .filter((article): article is PubMedArticle => article !== null); // Filter out nulls

    console.log(`Processed ${articles.length} articles for page ${page}. Total count: ${count}.`);

    // Return current page articles and the total count
    return {
        articles, // Articles for the current page
        count,    // Total count from ESearch
        queryKey, // Optional: Pass back if needed
        webEnv    // Optional: Pass back if needed
    };
}

// Optional: Add a function using EFetch to get abstracts if needed
// export async function getPubMedAbstracts(pmids: string[]): Promise<Record<string, string>> { ... } 