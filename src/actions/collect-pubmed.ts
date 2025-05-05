'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { withAuth } from '@/lib/auth-utils';
import { APIResponse } from '@/types/api';
import { DocumentProcessingStatus } from '@prisma/client'; // Import enum
import { revalidatePath } from 'next/cache';
import { chromium } from 'playwright'; // Reverted back to playwright
// import { chromium } from 'playwright-extra'; // Import playwright-extra - REMOVED
// import stealthPlugin from 'playwright-extra-plugin-stealth'; // Import stealth plugin - REMOVED
import TurndownService from 'turndown'; // Import turndown

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

/**
 * Collects PubMed article information.
 * Prioritizes fetching full text from PMC URL using Playwright.
 * If no PMC URL, checks for DOI. If DOI exists, saves metadata/abstract only (no Playwright).
 * If no PMC or DOI, attempts to fetch from PubMed URL using Playwright.
 * Saves the result (Markdown or fallback) to a knowledge base document.
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
        attemptPlaywright = true; // Try Playwright for PMC
        console.log(`[Collect KB] PMCID ${pmcid} found. Using PMC URL: ${targetUrl}`);
    } else if (doi) {
        targetUrl = `https://doi.org/${doi}`;
        urlType = 'doi';
        attemptPlaywright = false; // Skip Playwright for DOI (too variable)
        console.log(`[Collect KB] No PMCID, DOI ${doi} found. Using DOI URL: ${targetUrl}. Will save metadata/abstract only.`);
    } else {
        targetUrl = pubmedUrl;
        urlType = 'pubmed';
        attemptPlaywright = true; // Try Playwright for PubMed
        console.log(`[Collect KB] No PMCID or DOI found. Using PubMed URL: ${targetUrl}`);
    }

    let browser = null;
    let markdownContent = '';
    let fetchError: string | null = null;
    const turndownService = new TurndownService({ headingStyle: 'atx' });

    console.log(`[Collect KB] Starting process for PMID: ${pmid}, Type: ${urlType}`);

    if (attemptPlaywright) {
        // --- Playwright Fetching and Conversion --- 
        console.log('[Collect KB Playwright] Launching browser...');
        try {
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();

            console.log(`[Collect KB Playwright] Navigating to ${targetUrl}...`);
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

            let mainContentSelector = urlType === 'pmc'
                ? 'article .article-body, article, .jig-ncbiinpagenav-content, #article-content' // PMC selectors
                : '.abstract-content.selected, .abstract, section.abstract, #enc-abstract, #main-content'; // PubMed selectors

            console.log(`[Collect KB Playwright] Waiting for selector: ${mainContentSelector}...`);
            try {
                await page.waitForSelector(mainContentSelector, { timeout: 30000 });
            } catch (waitError) {
                console.warn(`[Collect KB Playwright] Initial selector wait failed. Trying fallback selectors...`);
                const fallbackSelector = 'body #main-content, body article, body .abstract, body';
                console.log(`[Collect KB Playwright] Waiting for fallback selector: ${fallbackSelector}...`);
                try {
                    await page.waitForSelector(fallbackSelector, { timeout: 15000 });
                    mainContentSelector = fallbackSelector;
                } catch (fallbackWaitError) {
                    console.error('[Collect KB Playwright] All selector waits failed. Proceeding to extract full body or fail.');
                    mainContentSelector = 'body';
                }
            }

            console.log(`[Collect KB Playwright] Using final selector: ${mainContentSelector}`);
            console.log('[Collect KB Playwright] Extracting HTML from main content area...');
            const mainContentHtml = await page.locator(mainContentSelector).first().innerHTML();

            if (!mainContentHtml) {
                throw new Error('无法从页面提取主要内容HTML。即使使用备用选择器。');
            }

            console.log(`[Collect KB Playwright] Converting extracted HTML (${mainContentHtml.length} chars) to Markdown...`);
            markdownContent = turndownService.turndown(mainContentHtml);
            console.log(`[Collect KB Playwright] Converted Markdown length: ${markdownContent.length}`);

            if (!markdownContent && mainContentHtml.length > 0) {
                console.warn("[Collect KB Playwright] Markdown conversion resulted in empty content despite extracting HTML.");
                fetchError = "Markdown conversion failed (empty result).";
            }
            if (!markdownContent) {
                console.warn("[Collect KB Playwright] Markdown conversion resulted in empty content (likely no HTML extracted).");
                fetchError = "Markdown conversion failed (no content extracted).";
            }

        } catch (err: any) {
            console.error(`[Collect KB Playwright] Error during Playwright fetch/conversion for ${pmid} at ${targetUrl}:`, err);
            fetchError = err.message || "使用Playwright获取或转换文章内容时出错。";
        } finally {
            if (browser) {
                console.log('[Collect KB Playwright] Closing browser...');
                await browser.close();
            }
        }
    } else {
        // --- DOI or other cases where Playwright is skipped --- 
        console.log(`[Collect KB] Skipping Playwright for URL type: ${urlType}. Formatting metadata/abstract only.`);
        markdownContent = formatPubMedDataToMarkdown(validation.data); // Use helper for basic formatting
        fetchError = null; // No fetch error in this path
    }

    // If Playwright failed OR was skipped and resulted in no content, generate fallback
    if (!markdownContent) {
        console.warn(`[Collect KB] No markdown content generated (Playwright failed or skipped). Using fallback.`);
        // Always generate a fallback if markdownContent is empty at this point
        markdownContent = `# ${title}\n\n[Source Link](${targetUrl})\n\n## Abstract\n\n${abstract || 'No abstract available.'}`;
        if (fetchError) { // Append error only if there was a fetch error
            markdownContent += `\n\n**Error:** Failed to fetch/convert full content. Reason: ${fetchError}`;
        } else if (!attemptPlaywright) {
            markdownContent += `\n\n_Note: Full text fetching was skipped for this source type (${urlType})._`;
        }
    }

    // --- Database Operations --- 
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

        // 2. Check for existing document
        const existingDoc = await prisma.document.findFirst({
            where: {
                knowledgeBaseId: knowledgeBaseId,
                metadata: {
                    path: ['pmid'],
                    equals: pmid,
                },
                source_type: 'pubmed_collection_playwright'
            }
        });
        if (existingDoc) {
            return { success: false, error: `文章 PMID:${pmid} 已存在于此知识库中。` };
        }

        // 3. Calculate size and tokens
        const byteSize = Buffer.byteLength(markdownContent, 'utf8');
        const tokenCount = Math.ceil(byteSize / 4);

        // 4. Create the Document record
        const newDocument = await prisma.document.create({
            data: {
                name: title,
                type: 'text/markdown',
                // Update source type based on actual process
                source_type: attemptPlaywright ? 'pubmed_collection_playwright' : 'pubmed_collection_metadata',
                // Status depends on fetchError only if Playwright was attempted
                processing_status: attemptPlaywright ? (fetchError ? DocumentProcessingStatus.FAILED : DocumentProcessingStatus.SUCCESSED) : DocumentProcessingStatus.SUCCESSED,
                processing_error: fetchError, // Null if Playwright wasn't attempted or succeeded
                knowledgeBaseId: knowledgeBaseId,
                created_by: userId,
                markdown_content: markdownContent,
                size: byteSize,
                token_num: tokenCount,
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
                    finalUrlUsed: targetUrl, // Store the URL actually used
                    urlType: urlType, // Store the type (pmc, doi, pubmed)
                    fetchAttempted: attemptPlaywright, // Record if Playwright was tried
                    title: title,
                    authors: authors,
                    journal: journal,
                    pubdate: pubdate,
                    pmcid: pmcid,
                    doi: doi,
                    fetchError: fetchError
                }
            },
        });

        // 5. Update KB stats (only increment tokens if processing succeeded or wasn't attempted)
        if (!fetchError) {
            await prisma.knowledgeBase.update({
                where: { id: knowledgeBaseId },
                data: { doc_num: { increment: 1 }, token_num: { increment: tokenCount } }
            });
        } else {
            await prisma.knowledgeBase.update({
                where: { id: knowledgeBaseId },
                data: { doc_num: { increment: 1 } } // Increment doc count even on failure
            });
        }

        console.log(`[Collect KB] Document ${newDocument.id} created in KB ${knowledgeBaseId} (URL Type: ${urlType}, Playwright Attempted: ${attemptPlaywright}, Status: ${fetchError ? 'FAILED' : 'SUCCEEDED'})`);
        revalidatePath(`/knowledgebase/${knowledgeBaseId}`);

        return { success: true, data: { documentId: newDocument.id } };

    } catch (error: unknown) {
        console.error(`[Collect KB] Failed to save document for PubMed article ${pmid} to KB ${knowledgeBaseId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `尝试将 PMID:${pmid} 作为文档保存时发生唯一约束冲突。` };
        }
        const errorMessage = error instanceof Error ? error.message : "保存文章到知识库时发生未知数据库错误。";
        return { success: false, error: errorMessage };
    }
});
