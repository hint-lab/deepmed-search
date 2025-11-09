import xml2js from 'xml2js';
import { PubMedArticle, PubMedSearchResult } from './types';

// Ensure xml2js is installed: npm install xml2js @types/xml2js
// You might need node-fetch if using an older Node.js version without global fetch
// import fetch from 'node-fetch';

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
 * 从PubMed搜索文章并获取包括摘要在内的详细信息 (支持分页)
 * @param term 搜索关键词
 * @param retmax 每页最大结果数量 (default: 10)
 * @param page 要获取的页码 (1-based, default: 1)
 * @param ncbiApiKey NCBI API Key (可选，优先使用用户配置，否则使用环境变量)
 * @returns PubMed搜索结果 (包含当前页的文章和总数)
 */
export async function searchPubMed(
    term: string,
    retmax: number = 10, // Default results per page
    page: number = 1,     // Default to page 1
    ncbiApiKey?: string   // Optional API key
): Promise<PubMedSearchResult> {
    if (!term) {
        throw new Error('Search term cannot be empty');
    }
    if (page < 1) page = 1;
    if (retmax < 1) retmax = 10;

    const retstart = (page - 1) * retmax;

    // 获取 API key，优先使用传入的参数，否则使用环境变量
    const apiKey = ncbiApiKey || process.env.NCBI_API_KEY;

    console.log(`Searching PubMed for: "${term}", Page: ${page}, ResultsPerPage: ${retmax}, RetStart: ${retstart}`);

    // --- Step 1: ESearch - Get count and history info --- 
    const esearchUrl = new URL(`${EUTILS_BASE}esearch.fcgi`);
    esearchUrl.searchParams.set('db', 'pubmed');
    esearchUrl.searchParams.set('term', term);
    esearchUrl.searchParams.set('retmax', '0'); // Get count and history only
    esearchUrl.searchParams.set('usehistory', 'y');
    if (apiKey) esearchUrl.searchParams.set('api_key', apiKey);

    let count = 0;
    let queryKey: string | undefined;
    let webEnv: string | undefined;

    try {
        const timeoutSignal = createTimeoutSignal(20000);
        const esearchRes = await fetch(esearchUrl.toString(), {
            headers: { 'Accept': 'application/xml, text/xml, */*' },
            signal: timeoutSignal
        });

        if (!esearchRes.ok) {
            throw new Error(`ESearch request failed: ${esearchRes.status} ${esearchRes.statusText}`);
        }
        const esearchResultXml = await esearchRes.text();
        const esearchData = await parser.parseStringPromise(esearchResultXml);

        if (!esearchData.eSearchResult) throw new Error('Invalid ESearch response format');

        count = parseInt(esearchData.eSearchResult.Count || '0', 10);
        queryKey = esearchData.eSearchResult.QueryKey;
        webEnv = esearchData.eSearchResult.WebEnv;
        console.log(`ESearch found Total: ${count}, QueryKey: ${queryKey}, WebEnv: ${webEnv}`);

    } catch (error: any) {
        console.error('Error during ESearch processing:', error);
        throw new Error(`Failed to execute ESearch query: ${error.message}`);
    }

    if (count === 0 || !queryKey || !webEnv) {
        console.log('No results found or missing history info from ESearch.');
        return { articles: [], count: 0 };
    }

    // --- Step 2: EFetch - Fetch full records (including abstract) for the current page using history --- 
    const efetchUrl = `${EUTILS_BASE}efetch.fcgi`;
    const efetchParams = new URLSearchParams();
    efetchParams.set('db', 'pubmed');
    efetchParams.set('query_key', queryKey);
    efetchParams.set('WebEnv', webEnv);
    efetchParams.set('rettype', 'abstract'); // Request abstract format
    efetchParams.set('retmode', 'xml');
    efetchParams.set('retstart', String(retstart));
    efetchParams.set('retmax', String(retmax));
    if (apiKey) efetchParams.set('api_key', apiKey);

    // Retry logic for EFetch
    const MAX_RETRIES = 3;
    let retryCount = 0;
    let fetchXmlText: string | null = null;
    let lastError: Error | null = null;

    while (retryCount < MAX_RETRIES && fetchXmlText === null) {
        retryCount++;
        try {
            console.log(`EFetch attempt #${retryCount} for page ${page} (retstart: ${retstart})`);
            const timeoutSignal = createTimeoutSignal(45000); // Longer timeout for efetch

            // Use POST for efetch with history
            const response = await fetch(efetchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/xml, text/xml, */*',
                },
                body: efetchParams.toString(),
                signal: timeoutSignal
            });

            if (!response.ok) {
                lastError = new Error(`EFetch failed (Attempt ${retryCount}/${MAX_RETRIES}): ${response.status} ${response.statusText}`);
                console.warn(lastError.message);
                if (retryCount >= MAX_RETRIES) throw lastError;
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
                continue; // Go to next retry
            }

            const xmlText = await response.text();
            if (!xmlText || xmlText.trim().length === 0) {
                lastError = new Error(`EFetch received empty response (Attempt ${retryCount}/${MAX_RETRIES}).`);
                console.warn(lastError.message);
                if (retryCount >= MAX_RETRIES) throw lastError;
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
                continue; // Go to next retry
            }

            fetchXmlText = xmlText; // Success!
            console.log(`EFetch XML received successfully on attempt #${retryCount} (${fetchXmlText.length} bytes)`);

        } catch (error: any) {
            lastError = error;
            console.error(`Error during EFetch fetch/retry logic (Attempt #${retryCount}):`, error);
            if (retryCount >= MAX_RETRIES) {
                throw new Error(`EFetch failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message ?? 'Unknown error in catch block'}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
        }
    } // End while loop

    if (fetchXmlText === null) {
        throw new Error(`Failed to get EFetch response after all retries. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    // --- Step 3: Parse EFetch XML --- 
    let parsedData: any;
    try {
        parsedData = await parser.parseStringPromise(fetchXmlText);
    } catch (parseError) {
        console.error("Error parsing EFetch XML:", parseError);
        console.log('Received XML (first 500 chars):', fetchXmlText.substring(0, 500));
        throw new Error('Failed to parse EFetch XML response');
    }

    // Check for top-level errors
    if (parsedData.eFetchResult && parsedData.eFetchResult.ERROR) {
        const apiError = parsedData.eFetchResult.ERROR;
        console.error("PubMed API Error (from EFetch XML):", apiError);
        throw new Error(`PubMed API Error in EFetch: ${typeof apiError === 'string' ? apiError : JSON.stringify(apiError)}`);
    }

    // Extract articles from <PubmedArticleSet><PubmedArticle> structure
    let articleSet: any[] = [];
    if (parsedData.PubmedArticleSet && parsedData.PubmedArticleSet.PubmedArticle) {
        articleSet = Array.isArray(parsedData.PubmedArticleSet.PubmedArticle)
            ? parsedData.PubmedArticleSet.PubmedArticle
            : [parsedData.PubmedArticleSet.PubmedArticle];
    } else {
        console.warn("No PubmedArticle found in EFetch response for page", page);
    }

    const articles: PubMedArticle[] = articleSet.map((articleData: any): PubMedArticle | null => {
        const medlineCitation = articleData?.MedlineCitation;
        const articleInfo = medlineCitation?.Article;
        const journalInfo = articleInfo?.Journal;
        const abstractInfo = articleInfo?.Abstract;
        const authorList = articleInfo?.AuthorList?.Author;

        const pmid = medlineCitation?.PMID?._ || medlineCitation?.PMID || ''; // Handle potential {_: 'value'} or just 'value'
        if (!pmid) {
            console.warn("Skipping article due to missing PMID:", JSON.stringify(articleData).substring(0, 200));
            return null;
        }

        // Extract Abstract Text - handles potential multiple paragraphs/sections
        let abstractText = '';
        if (abstractInfo?.AbstractText) {
            const abstractParts = Array.isArray(abstractInfo.AbstractText) ? abstractInfo.AbstractText : [abstractInfo.AbstractText];
            abstractText = abstractParts.map((part: any) => {
                if (typeof part === 'string') return part;
                // Handle structured abstracts like { $: { Label: 'BACKGROUND' }, _: 'Text...' }
                let text = part._ || '';
                if (part.$ && part.$.Label) {
                    text = `**${part.$.Label}:** ${text}`; // Add label as bold
                }
                return text;
            }).join('\n\n'); // Join sections with double newline
        }

        // Extract Authors
        let authorsString = 'No Authors Listed';
        if (authorList) {
            const authorsArray = Array.isArray(authorList) ? authorList : [authorList];
            authorsString = authorsArray.map((author: any) => {
                const lastName = author.LastName || '';
                const foreName = author.ForeName || '';
                const initials = author.Initials || '';
                // Prioritize LastName + Initials if available
                if (lastName && initials) return `${lastName} ${initials}`;
                if (lastName && foreName) return `${lastName} ${foreName}`; // Fallback to full ForeName
                if (lastName) return lastName; // Fallback to LastName only
                if (author.CollectiveName) return author.CollectiveName; // Handle collective names
                return '';
            }).filter(Boolean).join(', ');
        }

        // Extract Journal Info
        const journalTitle = journalInfo?.Title || '';
        const journalISO = journalInfo?.ISOAbbreviation || '';
        const journalString = journalTitle || journalISO || 'No Journal Info';

        // Extract Publication Date
        const pubDate = articleInfo?.Journal?.JournalIssue?.PubDate;
        let pubDateString = 'No Date';
        if (pubDate) {
            pubDateString = [pubDate.Year, pubDate.Month, pubDate.Day].filter(Boolean).join('-');
            if (pubDateString === '') pubDateString = pubDate.MedlineDate || 'No Date'; // Fallback
        }

        return {
            pmid: pmid,
            title: articleInfo?.ArticleTitle || 'No Title',
            authors: authorsString,
            journal: journalString,
            pubdate: pubDateString,
            abstract: abstractText || undefined, // Set to undefined if empty
        };
    }).filter((article): article is PubMedArticle => article !== null);

    console.log(`Processed ${articles.length} articles with abstracts for page ${page}. Total count: ${count}.`);

    return {
        articles, // Articles for the current page with abstracts
        count,    // Total count from ESearch
    };
}

/**
 * Fetches the details of a single PubMed article by its PMID, including the abstract.
 * @param pmid The PubMed ID of the article to fetch.
 * @param ncbiApiKey NCBI API Key (可选，优先使用用户配置，否则使用环境变量)
 * @returns A PubMedArticle object or null if not found or an error occurs.
 */
export async function getPubMedArticleDetails(pmid: string, ncbiApiKey?: string): Promise<PubMedArticle | null> {
    if (!pmid || typeof pmid !== 'string' || !pmid.trim()) {
        console.error("Invalid PMID provided to getPubMedArticleDetails");
        return null;
    }

    console.log(`Fetching details for PMID: ${pmid}`);

    // 获取 API key，优先使用传入的参数，否则使用环境变量
    const apiKey = ncbiApiKey || process.env.NCBI_API_KEY;

    const efetchUrl = new URL(`${EUTILS_BASE}efetch.fcgi`);
    efetchUrl.searchParams.set('db', 'pubmed');
    efetchUrl.searchParams.set('id', pmid.trim());
    efetchUrl.searchParams.set('rettype', 'abstract');
    efetchUrl.searchParams.set('retmode', 'xml');
    if (apiKey) efetchUrl.searchParams.set('api_key', apiKey);

    let fetchXmlText: string | null = null;
    let lastError: Error | null = null;

    try {
        const timeoutSignal = createTimeoutSignal(30000); // 30 second timeout
        const response = await fetch(efetchUrl.toString(), {
            headers: { 'Accept': 'application/xml, text/xml, */*' },
            signal: timeoutSignal
        });

        if (!response.ok) {
            throw new Error(`EFetch failed for PMID ${pmid}: ${response.status} ${response.statusText}`);
        }

        fetchXmlText = await response.text();
        if (!fetchXmlText || fetchXmlText.trim().length === 0) {
            throw new Error(`EFetch received empty response for PMID ${pmid}.`);
        }
        console.log(`EFetch XML received for PMID ${pmid} (${fetchXmlText.length} bytes)`);

    } catch (error: any) {
        lastError = error;
        console.error(`Error during EFetch for PMID ${pmid}:`, error);
        // Don't throw here, just return null later
    }

    if (fetchXmlText === null) {
        console.error(`Failed to get EFetch response for PMID ${pmid}. Last error: ${lastError?.message || 'Unknown fetch error'}`);
        return null; // Failed to fetch
    }

    // --- Parse EFetch XML --- 
    let parsedData: any;
    try {
        parsedData = await parser.parseStringPromise(fetchXmlText);
    } catch (parseError) {
        console.error(`Error parsing EFetch XML for PMID ${pmid}:`, parseError);
        console.log('Received XML (first 500 chars):', fetchXmlText.substring(0, 500));
        return null; // Failed to parse
    }

    // Check for top-level errors
    if (parsedData.eFetchResult && parsedData.eFetchResult.ERROR) {
        const apiError = parsedData.eFetchResult.ERROR;
        console.error(`PubMed API Error (from EFetch XML for PMID ${pmid}):`, apiError);
        return null; // API returned an error
    }

    // Extract article from <PubmedArticleSet><PubmedArticle> structure
    let articleData: any | null = null;
    if (parsedData.PubmedArticleSet && parsedData.PubmedArticleSet.PubmedArticle) {
        // If multiple articles are somehow returned for one ID (unlikely), take the first.
        const articleSet = Array.isArray(parsedData.PubmedArticleSet.PubmedArticle)
            ? parsedData.PubmedArticleSet.PubmedArticle
            : [parsedData.PubmedArticleSet.PubmedArticle];
        if (articleSet.length > 0) {
            articleData = articleSet[0];
        }
    }

    if (!articleData) {
        console.warn(`No PubmedArticle found in EFetch response for PMID ${pmid}`);
        return null; // Article data not found in the response
    }

    // --- Extract Details (Reusing logic from searchPubMed) --- 
    try {
        const medlineCitation = articleData?.MedlineCitation;
        const pubmedData = articleData?.PubmedData; // Get PubmedData section
        const articleInfo = medlineCitation?.Article;
        const journalInfo = articleInfo?.Journal;
        const abstractInfo = articleInfo?.Abstract;
        const authorList = articleInfo?.AuthorList?.Author;

        // Re-verify PMID just in case
        const fetchedPmid = medlineCitation?.PMID?._ || medlineCitation?.PMID || '';
        if (!fetchedPmid || fetchedPmid !== pmid.trim()) {
            console.warn(`PMID mismatch in response for ${pmid}. Found: ${fetchedPmid}`);
            return null;
        }

        // Extract other IDs (PMCID, DOI)
        let pmcId: string | undefined = undefined;
        let doi: string | undefined = undefined;
        if (pubmedData?.ArticleIdList?.ArticleId) {
            const idList = Array.isArray(pubmedData.ArticleIdList.ArticleId)
                ? pubmedData.ArticleIdList.ArticleId
                : [pubmedData.ArticleIdList.ArticleId];

            idList.forEach((idEntry: any) => {
                const idValue = String(idEntry?._ || idEntry || '');
                const idType = idEntry?.$?.IdType;

                if (idType === 'pmc') {
                    // Remove prefix directly during assignment if it's a string
                    if (typeof idValue === 'string' && idValue.toUpperCase().startsWith('PMC')) {
                        pmcId = idValue.substring(3);
                    } else {
                        pmcId = idValue;
                    }
                } else if (idType === 'doi') {
                    doi = idValue;
                }
            });
            // No need for separate prefix check anymore
        }

        // Extract Abstract Text
        let abstractText = '';
        if (abstractInfo?.AbstractText) {
            const abstractParts = Array.isArray(abstractInfo.AbstractText) ? abstractInfo.AbstractText : [abstractInfo.AbstractText];
            abstractText = abstractParts.map((part: any) => {
                if (typeof part === 'string') return part;
                let text = part._ || '';
                if (part.$ && part.$.Label) {
                    text = `**${part.$.Label}:** ${text}`;
                }
                return text;
            }).join('\n\n');
        }

        // Extract Authors
        let authorsString = 'No Authors Listed';
        if (authorList) {
            const authorsArray = Array.isArray(authorList) ? authorList : [authorList];
            authorsString = authorsArray.map((author: any) => {
                const lastName = author.LastName || '';
                const foreName = author.ForeName || '';
                const initials = author.Initials || '';
                if (lastName && initials) return `${lastName} ${initials}`;
                if (lastName && foreName) return `${lastName} ${foreName}`;
                if (lastName) return lastName;
                if (author.CollectiveName) return author.CollectiveName;
                return '';
            }).filter(Boolean).join(', ');
        }

        // Extract Journal Info
        const journalTitle = journalInfo?.Title || '';
        const journalISO = journalInfo?.ISOAbbreviation || '';
        const journalString = journalTitle || journalISO || 'No Journal Info';

        // Extract Publication Date
        const pubDate = articleInfo?.Journal?.JournalIssue?.PubDate;
        let pubDateString = 'No Date';
        if (pubDate) {
            pubDateString = [pubDate.Year, pubDate.Month, pubDate.Day].filter(Boolean).join('-');
            if (pubDateString === '') pubDateString = pubDate.MedlineDate || 'No Date';
        }

        const finalArticle: PubMedArticle = {
            pmid: fetchedPmid,
            title: articleInfo?.ArticleTitle || 'No Title',
            authors: authorsString,
            journal: journalString,
            pubdate: pubDateString,
            abstract: abstractText || undefined,
            pmcid: pmcId,
            doi: doi,
        };

        console.log(`Successfully fetched and parsed details for PMID ${pmid}`);
        return finalArticle;

    } catch (extractionError: any) {
        console.error(`Error extracting details for PMID ${pmid} from parsed data:`, extractionError);
        return null; // Failed during data extraction
    }
}

// Optional: Add a function using EFetch to get abstracts if needed
// export async function getPubMedAbstracts(pmids: string[]): Promise<Record<string, string>> { ... } 