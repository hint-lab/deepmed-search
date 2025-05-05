'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { withAuth } from '@/lib/auth-utils';
import { APIResponse } from '@/types/api';
import { IDocumentProcessingStatus } from '@/types/enums'; // Import enum
import { revalidatePath } from 'next/cache';
import { chromium } from 'playwright'; // Reverted back to playwright
// import { chromium } from 'playwright-extra'; // Import playwright-extra - REMOVED
// import stealthPlugin from 'playwright-extra-plugin-stealth'; // Import stealth plugin - REMOVED
import TurndownService from 'turndown'; // Import turndown
import logger from '@/utils/logger'; // Import logger

// Apply the stealth plugin - REMOVED
// chromium.use(stealthPlugin());

// Removed CollectSchema (unused)

// Removed collectPubMedArticleAction

// Removed checkPubMedCollectedAction

// Schema for input validation (for collecting to KB)
const CollectToKbSchema = z.object({
    knowledgeBaseId: z.string().min(1, "Knowledge Base ID is required"),
    pmid: z.string().min(1, "PMID is required"),
    title: z.string().min(1, "Title is required"),
    authors: z.string().optional(),
    journal: z.string().optional(),
    pubdate: z.string().optional(),
    abstract: z.string().optional(),
    pubmedUrl: z.string().url("Invalid PubMed URL"),
    // Add pmcid and doi if they are available from the source
    pmcid: z.string().optional(),
    doi: z.string().optional(),
});

// Helper function to format structured PubMed data to Markdown (used for DOI fallback)
function formatPubMedDataToMarkdown(article: z.infer<typeof CollectToKbSchema>): string {
    let md = `# ${article.title}\n\n`; // Title
    if (article.authors) md += `**Authors:** ${article.authors}\n`;
    if (article.journal) md += `**Journal:** ${article.journal}\n`;
    if (article.pubdate) md += `**Publication Date:** ${article.pubdate}\n`;
    md += `**PMID:** ${article.pmid}\n`;
    if (article.pmcid) md += `**PMCID:** [PMC${article.pmcid}](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${article.pmcid}/)\n`; // Link PMCID
    if (article.doi) md += `**DOI:** [${article.doi}](https://doi.org/${article.doi})\n`; // Link DOI
    md += `**PubMed Link:** [${article.pubmedUrl}](${article.pubmedUrl})\n\n`;
    md += `## Abstract\n\n`;
    md += `${article.abstract || 'No abstract available.'}\n`;
    return md;
}

// Import processing actions
import {
    splitDocumentAction,
    indexDocumentChunksAction,
    updateDocumentProcessingStatusAction
} from './document-process';

/**
 * Collects PubMed article information, saves it, and triggers processing (split/index).
 * Prioritizes fetching full text from PMC URL using Playwright.
 * If no PMC URL, checks for DOI. If DOI exists, saves metadata/abstract only (no Playwright).
 * If no PMC or DOI, attempts to fetch from PubMed URL using Playwright.
 * Saves the result (Markdown or fallback) to a knowledge base document.
 * Triggers splitting and indexing if content was successfully obtained or Playwright was skipped.
 */
export const collectPubMedToKnowledgeBaseAction = withAuth(async (
    session,
    articleData: z.infer<typeof CollectToKbSchema>
): Promise<APIResponse<{ documentId: string }>> => {
    const validation = CollectToKbSchema.safeParse(articleData);
    if (!validation.success) {
        const errorMessages = validation.error.errors.map(e => e.message).join(', ');
        return { success: false, error: `无效数据: ${errorMessages}` };
    }

    const { knowledgeBaseId, pmid, title, authors, journal, pubdate, abstract, pubmedUrl, pmcid, doi } = validation.data;
    const userId = session.user.id;

    // --- Determine URL and Fetch Strategy ---  
    let targetUrl: string;
    let urlType: 'pmc' | 'doi' | 'pubmed';
    let attemptPlaywright = false;

    if (pmcid) {
        targetUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcid}/`;
        urlType = 'pmc';
        attemptPlaywright = true;
        logger.info(`[Collect KB] PMCID ${pmcid} found. Using PMC URL: ${targetUrl}`, { pmid, kbId: knowledgeBaseId });
    } else if (doi) {
        targetUrl = `https://doi.org/${doi}`;
        urlType = 'doi';
        attemptPlaywright = true;
        logger.info(`[Collect KB] No PMCID, DOI ${doi} found. Using DOI URL: ${targetUrl}. Attempting Playwright fetch.`, { pmid, kbId: knowledgeBaseId });
    } else {
        targetUrl = pubmedUrl;
        urlType = 'pubmed';
        attemptPlaywright = true;
        logger.info(`[Collect KB] No PMCID or DOI found. Using PubMed URL: ${targetUrl}`, { pmid, kbId: knowledgeBaseId });
    }

    let browser = null;
    let markdownContent = '';
    let fetchError: string | null = null;
    const turndownService = new TurndownService({ headingStyle: 'atx' });

    logger.info(`[Collect KB] Starting process for PMID: ${pmid}, Type: ${urlType}`, { pmid, kbId: knowledgeBaseId });

    if (attemptPlaywright) {
        // --- Playwright Fetching and Conversion ---
        logger.info('[Collect KB Playwright] Launching browser...', { pmid });
        try {
            browser = await chromium.launch({ headless: true });
            const context = await browser.newContext(); // Use context for better isolation
            const page = await context.newPage();

            logger.info(`[Collect KB Playwright] Navigating to ${targetUrl}...`, { pmid, url: targetUrl });
            await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 }); // Use networkidle for potentially dynamic content

            // Add specific wait for DOI links to handle potential verification/redirects
            if (urlType === 'doi') {
                logger.info(`[Collect KB Playwright DOI] Waiting 7 seconds after navigation for potential verification/redirects...`, { pmid });
                await page.waitForTimeout(7000);
            }

            let combinedHtml = '';

            if (urlType === 'pmc') {
                logger.info(`[Collect KB Playwright PMC] Attempting to extract Abstract and Body for ${pmid}`, { pmid });
                // Try to get Abstract
                const abstractSelectors = ['section#abstract1', '#abstract .abstract-sec', 'div.abstract', 'section#abstract']; // Prioritize ID
                let abstractHtml = '';
                for (const selector of abstractSelectors) {
                    try {
                        await page.waitForSelector(selector, { timeout: 5000 }); // Shorter timeout for specific sections
                        abstractHtml = await page.locator(selector).first().innerHTML();
                        logger.info(`[Collect KB Playwright PMC] Found Abstract using selector: ${selector}`, { pmid });
                        combinedHtml += `<h2>Abstract</h2>\n${abstractHtml}\n\n`;
                        break; // Found it
                    } catch (e) {
                        logger.warn(`[Collect KB Playwright PMC] Abstract selector failed: ${selector}`, { pmid });
                    }
                }
                if (!abstractHtml) {
                    logger.warn(`[Collect KB Playwright PMC] Could not find Abstract for ${pmid}`, { pmid });
                }

                // Try to get Body
                const bodySelectors = ['section.body.main-article-body', 'div.article-body', '#body', 'article[itemprop="articleBody"]']; // Prioritize specific class
                let bodyHtml = '';
                for (const selector of bodySelectors) {
                    try {
                        await page.waitForSelector(selector, { timeout: 10000 });
                        bodyHtml = await page.locator(selector).first().innerHTML();
                        logger.info(`[Collect KB Playwright PMC] Found Body using selector: ${selector}`, { pmid });
                        combinedHtml += `<h2>Main Body</h2>\n${bodyHtml}\n\n`;
                        break; // Found it
                    } catch (e) {
                        logger.warn(`[Collect KB Playwright PMC] Body selector failed: ${selector}`, { pmid });
                    }
                }
                if (!bodyHtml) {
                    logger.warn(`[Collect KB Playwright PMC] Could not find Body for ${pmid}. Content might be incomplete.`, { pmid });
                }

                // If combined HTML is still empty after trying specific selectors, fall back to broader approach
                if (!combinedHtml) {
                    logger.warn(`[Collect KB Playwright PMC] Failed to find specific Abstract/Body for ${pmid}. Falling back to broader selector.`, { pmid });
                    const fallbackSelector = 'article .article-body, article, .jig-ncbiinpagenav-content, #article-content';
                    try {
                        await page.waitForSelector(fallbackSelector, { timeout: 15000 });
                        combinedHtml = await page.locator(fallbackSelector).first().innerHTML();
                    } catch (fallbackError) {
                        logger.error('[Collect KB Playwright PMC] Fallback selector also failed.', { pmid, error: fallbackError });
                        throw new Error('无法使用特定或后备选择器提取 PMC 内容。');
                    }
                }

            } else if (urlType === 'pubmed') {
                logger.info(`[Collect KB Playwright PubMed] Attempting to extract Abstract for ${pmid}`, { pmid });
                // Try to get Abstract only from PubMed
                const abstractSelectors = ['#enc-abstract', '.abstract-content.selected', 'div.abstract', 'section.abstract', 'section#abstract1']; // Keep broader set for PubMed
                let abstractHtml = '';
                for (const selector of abstractSelectors) {
                    try {
                        await page.waitForSelector(selector, { timeout: 10000 });
                        abstractHtml = await page.locator(selector).first().innerHTML();
                        logger.info(`[Collect KB Playwright PubMed] Found Abstract using selector: ${selector}`, { pmid });
                        combinedHtml = `<h2>Abstract</h2>\n${abstractHtml}`;
                        break; // Found it
                    } catch (e) {
                        logger.warn(`[Collect KB Playwright PubMed] Abstract selector failed: ${selector}`, { pmid });
                    }
                }
                if (!abstractHtml) {
                    logger.warn(`[Collect KB Playwright PubMed] Could not find Abstract for ${pmid}. Will rely on metadata abstract.`, { pmid });
                    // Let the fallback logic handle using the metadata abstract
                    combinedHtml = ''; // Ensure fallback triggers if needed
                }
            } else if (urlType === 'doi') {
                logger.info(`[Collect KB Playwright DOI] Attempting to extract Abstract and Body for ${pmid} from ${targetUrl}`, { pmid });

                // Try specific Publisher (Wiley) selectors first
                const wileyAbstractSelector = 'section.article-section__abstract';
                const wileyBodySelector = 'section.article-section__body';
                let abstractHtml = '';
                let bodyHtml = '';

                try {
                    await page.waitForSelector(wileyAbstractSelector, { timeout: 5000 });
                    abstractHtml = await page.locator(wileyAbstractSelector).first().innerHTML();
                    logger.info(`[Collect KB Playwright DOI] Found Abstract using Wiley selector: ${wileyAbstractSelector}`, { pmid });
                    combinedHtml += `<h2>Abstract</h2>\n${abstractHtml}\n\n`;
                } catch (e) {
                    logger.warn(`[Collect KB Playwright DOI] Wiley Abstract selector failed: ${wileyAbstractSelector}`, { pmid });
                }

                try {
                    await page.waitForSelector(wileyBodySelector, { timeout: 10000 });
                    bodyHtml = await page.locator(wileyBodySelector).first().innerHTML();
                    // TODO: Ideally, remove references section from bodyHtml if possible
                    logger.info(`[Collect KB Playwright DOI] Found Body using Wiley selector: ${wileyBodySelector}`, { pmid });
                    combinedHtml += `<h2>Main Body</h2>\n${bodyHtml}\n\n`;
                } catch (e) {
                    logger.warn(`[Collect KB Playwright DOI] Wiley Body selector failed: ${wileyBodySelector}`, { pmid });
                }

                // If Wiley selectors failed, try generic ones
                if (!combinedHtml) {
                    logger.warn(`[Collect KB Playwright DOI] Wiley selectors failed for ${pmid}. Trying generic selectors.`, { pmid });
                    const genericSelectors = ['article', 'main', '#main-content'];
                    for (const selector of genericSelectors) {
                        try {
                            await page.waitForSelector(selector, { timeout: 5000 });
                            combinedHtml = await page.locator(selector).first().innerHTML();
                            logger.info(`[Collect KB Playwright DOI] Found content using generic selector: ${selector}`, { pmid });
                            break; // Found something
                        } catch (e) {
                            logger.warn(`[Collect KB Playwright DOI] Generic selector failed: ${selector}`, { pmid });
                        }
                    }
                }
            }

            // Convert the final combined (or fallback) HTML to Markdown
            if (combinedHtml) {
                logger.info(`[Collect KB Playwright] Converting combined HTML (${combinedHtml.length} chars) to Markdown...`, { pmid });
                markdownContent = turndownService.turndown(combinedHtml);
                logger.info(`[Collect KB Playwright] Converted Markdown length: ${markdownContent.length}`, { pmid });
            } else {
                logger.warn("[Collect KB Playwright] No HTML content was successfully extracted.", { pmid });
                // Ensure fallback logic is triggered later
                markdownContent = '';
            }

            if (!markdownContent && combinedHtml.length > 0) {
                logger.warn("[Collect KB Playwright] Markdown conversion resulted in empty content despite extracting HTML.", { pmid });
                fetchError = "Markdown conversion failed (empty result).";
            }
            if (!markdownContent) { // Check again in case turndown failed
                logger.warn("[Collect KB Playwright] Markdown conversion resulted in empty content.", { pmid });
                // Don't set fetchError here if HTML was extracted, let the fallback handle it
                if (!combinedHtml.length) {
                    fetchError = "Markdown conversion failed (no content extracted).";
                }
            }

        } catch (err: any) {
            logger.error(`[Collect KB Playwright] Error during Playwright fetch/conversion for ${pmid} at ${targetUrl}:`, { pmid, error: err });
            fetchError = err.message || "使用Playwright获取或转换文章内容时出错。";
        } finally {
            if (browser) {
                logger.info('[Collect KB Playwright] Closing browser...', { pmid });
                await browser.close();
            }
        }
    } else {
        // --- DOI or other cases where Playwright is skipped ---
        logger.info(`[Collect KB] Skipping Playwright for URL type: ${urlType}. Formatting metadata/abstract only.`, { pmid });
        markdownContent = formatPubMedDataToMarkdown(validation.data); // Use helper for basic formatting
        fetchError = null; // No fetch error in this path
    }

    // If Playwright failed OR was skipped AND resulted in no content, generate fallback
    if (!markdownContent) {
        logger.warn(`[Collect KB] No markdown content generated (Playwright failed or skipped). Using fallback.`, { pmid, fetchError });
        // Always generate a fallback if markdownContent is empty at this point
        markdownContent = `# ${title}\n\n[Source Link](${targetUrl})\n\n## Abstract\n\n${abstract || 'No abstract available.'}`;
        if (fetchError) { // Append error only if there was a fetch error
            markdownContent += `\n\n**Error:** Failed to fetch/convert full content. Reason: ${fetchError}`;
        } else if (!attemptPlaywright) {
            markdownContent += `\n\n_Note: Full text fetching was skipped for this source type (${urlType})._`;
        }
        // Reset fetchError if we generated fallback for non-error cases (like DOI skip)
        if (!attemptPlaywright) fetchError = null;
    }

    // --- Database Operations ---
    let newDocumentId: string | null = null;
    let processingTriggered = false;
    // Use INDEXING as the initial status if no fetch error, otherwise FAILED
    let finalStatus: IDocumentProcessingStatus = fetchError ? IDocumentProcessingStatus.FAILED : IDocumentProcessingStatus.INDEXING;
    let initialTokenEstimate = 0;

    try {
        // 1. Verify Knowledge Base exists
        const kb = await prisma.knowledgeBase.findFirst({
            where: {
                id: knowledgeBaseId,
                OR: [
                    { created_by: userId },
                ]
            },
        });
        if (!kb) {
            return { success: false, error: "指定的知识库不存在或无权访问。" };
        }

        // 2. Check for existing document (simplified check based on PMID and KB)
        const existingDoc = await prisma.document.findFirst({
            where: {
                knowledgeBaseId: knowledgeBaseId,
                metadata: {
                    path: ['pmid'],
                    equals: pmid,
                },
            }
        });
        if (existingDoc) {
            logger.warn(`[Collect KB] Document with PMID:${pmid} already exists in KB ${knowledgeBaseId}. Skipping.`, { pmid, kbId: knowledgeBaseId });
            return { success: false, error: `文章 PMID:${pmid} 已存在于此知识库中。` };
        }

        // 3. Calculate size and estimate tokens
        const byteSize = Buffer.byteLength(markdownContent, 'utf8');
        initialTokenEstimate = Math.ceil(byteSize / 4); // Store for later KB update

        // Determine initial status
        let initialStatus: IDocumentProcessingStatus;
        let initialProgressMsg: string | null = null;
        let initialProgress = 0;
        if (fetchError) {
            initialStatus = IDocumentProcessingStatus.FAILED;
            initialProgressMsg = fetchError;
        } else {
            initialStatus = IDocumentProcessingStatus.INDEXING; // Ready for processing
            initialProgressMsg = '准备处理';
            initialProgress = 10;
            processingTriggered = true; // Mark that we intend to process
        }
        // finalStatus is already set based on fetchError initially
        // finalStatus = initialStatus; // Keep track for KB update - REMOVED redundant assignment

        // 4. Create the Document record
        const newDocument = await prisma.document.create({
            data: {
                name: title,
                type: 'text/markdown',
                source_type: attemptPlaywright ? 'pubmed_collection_playwright' : 'pubmed_collection_metadata',
                processing_status: initialStatus,
                processing_error: fetchError, // Store fetch error if any
                progress: initialProgress,
                progress_msg: initialProgressMsg,
                knowledgeBaseId: knowledgeBaseId,
                created_by: userId,
                markdown_content: markdownContent,
                size: byteSize,
                token_num: 0, // Will be updated after successful processing
                chunk_num: 0, // Will be updated after successful processing
                summary: abstract?.substring(0, 300) || title.substring(0, 300),
                enabled: true,
                create_date: new Date(),
                update_date: new Date(),
                create_time: BigInt(Date.now()),
                update_time: BigInt(Date.now()),
                parser_config: kb.parser_config || Prisma.JsonNull,
                metadata: {
                    pmid: pmid,
                    pubmedUrl: pubmedUrl,
                    pmcUrl: urlType === 'pmc' ? targetUrl : undefined,
                    doiUrl: urlType === 'doi' ? targetUrl : undefined,
                    finalUrlUsed: targetUrl,
                    urlType: urlType,
                    fetchAttempted: attemptPlaywright,
                    title: title,
                    authors: authors,
                    journal: journal,
                    pubdate: pubdate,
                    pmcid: pmcid,
                    doi: doi,
                    fetchError: fetchError // Store fetch error in metadata too
                }
            },
        });
        newDocumentId = newDocument.id;
        logger.info(`[Collect KB] Document ${newDocumentId} created in KB ${knowledgeBaseId} (URL Type: ${urlType}, Initial Status: ${initialStatus})`, { pmid, kbId: knowledgeBaseId, docId: newDocumentId });

        // --- Trigger Processing (Split & Index) if needed ---
        if (processingTriggered && newDocumentId) {
            logger.info(`[Collect KB Process] Triggering split/index for document ${newDocumentId}`, { docId: newDocumentId });
            let splitSuccess = false;
            let indexSuccess = false;

            try {
                // a) Split Document
                const splitResult = await splitDocumentAction(
                    newDocumentId,
                    [{ pageNumber: 1, content: markdownContent }], // Treat as single page
                    {
                        // Safely access parser_config properties with defaults
                        model: (kb.parser_config as any)?.model || 'text-embedding-3-small',
                        maintainFormat: true, // Assume maintain format for Markdown
                        documentName: title,
                        maxChunkSize: (kb.parser_config as any)?.chunk_size || 1000,
                        overlapSize: (kb.parser_config as any)?.chunk_overlap || 100,
                    }
                );

                if (!splitResult.success || !splitResult.data) {
                    throw new Error(splitResult.error || '文档分割失败');
                }
                splitSuccess = true;
                const chunks = splitResult.data.chunks;
                logger.info(`[Collect KB Process] Splitting successful for ${newDocumentId}. Chunks: ${chunks.length}`, { docId: newDocumentId });

                // Update progress after splitting - Use Enum member
                await updateDocumentProcessingStatusAction(newDocumentId, IDocumentProcessingStatus.INDEXING, {
                    progress: 50,
                    progressMsg: '分割完成，准备索引'
                });

                // b) Index Chunks
                const indexResult = await indexDocumentChunksAction(
                    newDocumentId,
                    knowledgeBaseId,
                    chunks
                );

                if (!indexResult.success) {
                    throw new Error(indexResult.error || '文档索引失败');
                }
                indexSuccess = true;
                logger.info(`[Collect KB Process] Indexing successful for ${newDocumentId}.`, { docId: newDocumentId });
                // indexDocumentChunksAction updates status to SUCCESSED internally
                finalStatus = IDocumentProcessingStatus.SUCCESSED; // Mark final status

            } catch (processingError: any) {
                logger.error(`[Collect KB Process] Error during processing for ${newDocumentId}:`, { docId: newDocumentId, error: processingError });
                finalStatus = IDocumentProcessingStatus.FAILED;
                // Update document status to FAILED - Use Enum member
                await updateDocumentProcessingStatusAction(newDocumentId, IDocumentProcessingStatus.FAILED, {
                    progress: 0,
                    progressMsg: `处理失败: ${processingError.message}`,
                    error: processingError.message
                });
            }
        }

        // 5. Update KB stats
        // Increment doc count regardless of processing outcome (if doc was created)
        // Increment token count ONLY if processing succeeded
        await prisma.knowledgeBase.update({
            where: { id: knowledgeBaseId },
            data: {
                doc_num: { increment: 1 },
                ...(finalStatus === IDocumentProcessingStatus.SUCCESSED && {
                    token_num: { increment: initialTokenEstimate } // Use initial estimate on success
                })
            }
        });
        logger.info(`[Collect KB] Updated KB ${knowledgeBaseId} stats. Final Doc Status: ${finalStatus}`, { kbId: knowledgeBaseId, finalStatus });

        revalidatePath(`/knowledgebase/${knowledgeBaseId}`);

        return { success: true, data: { documentId: newDocumentId } };

    } catch (error: unknown) {
        logger.error(`[Collect KB] Failed to save or process document for PubMed article ${pmid} to KB ${knowledgeBaseId}:`, { pmid, kbId: knowledgeBaseId, error });
        // Attempt to update status to FAILED if document was created but error occurred later
        if (newDocumentId) {
            try {
                // Use Enum member
                await updateDocumentProcessingStatusAction(newDocumentId, IDocumentProcessingStatus.FAILED, {
                    progress: 0,
                    progressMsg: '保存或处理过程中发生意外错误',
                    error: error instanceof Error ? error.message : String(error)
                });
            } catch (updateError) {
                logger.error(`[Collect KB] Failed to update document status to FAILED after primary error.`, { docId: newDocumentId, updateError });
            }
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `尝试将 PMID:${pmid} 作为文档保存时发生唯一约束冲突。` };
        }
        const errorMessage = error instanceof Error ? error.message : "保存或处理文章到知识库时发生未知数据库错误。";
        return { success: false, error: errorMessage };
    }
});
