import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import logger from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ModelOptions, ModelProvider } from 'zerox/node-zerox/dist/types';
import type { ZeroxOutput, Page as ZeroxPage } from 'zerox/node-zerox/dist/types';

const execAsync = promisify(exec);

// 文档处理结果类型
export interface ZeroxProcessResult {
    success: boolean;
    documentId: string;
    content?: string;
    error?: string;
    metadata: {
        completionTime?: number;
        fileName?: string;
        inputTokens?: number;
        outputTokens?: number;
        pages?: {
            pageNumber: number;
            content: string;
            contentLength: number;
        }[];
        processingTime?: number;
    };
}

/**
 * 使用 ZeroX 处理文档
 */
export async function processDocumentWithZerox(
    filePath: string,
    options: {
        model?: string;
        outputDir?: string;
        maintainFormat?: boolean;
        cleanup?: boolean;
        concurrency?: number;
        tempDir?: string;
        maxImageSize?: number;
        imageDensity?: number;
        imageHeight?: number;
        maxTesseractWorkers?: number;
        correctOrientation?: boolean;
        trimEdges?: boolean;
        directImageExtraction?: boolean;
        extractionPrompt?: string;
        extractOnly?: boolean;
        extractPerPage?: string[];
        pagesToConvertAsImages?: number | number[];
        prompt?: string;
        schema?: any;
    } = {}
): Promise<ZeroxProcessResult> {
    const startTime = Date.now();
    const documentId = uuidv4();

    try {
        // 确保输出目录存在
        const outputDir = options.outputDir || path.join(config.storage.path, 'zerox-output', documentId);
        await fs.ensureDir(outputDir);

        // 确保临时目录存在
        const tempDir = options.tempDir || path.join(config.storage.path, 'temp', documentId);
        await fs.ensureDir(tempDir);

        // 导入 zerox
        const { zerox } = await import('zerox');

        logger.info('开始使用 ZeroX 处理文档', {
            filePath,
            documentId,
            model: options.model || ModelOptions.OPENAI_GPT_4O_MINI
        });

        // 调用 zerox 处理文档
        const result = await zerox({
            filePath,
            modelProvider: ModelProvider.OPENAI,
            model: options.model || ModelOptions.OPENAI_GPT_4O_MINI,
            credentials: {
                apiKey: process.env.OPENAI_API_KEY || "",
            },
            outputDir,
            maintainFormat: options.maintainFormat === true,
            cleanup: options.cleanup !== false,
            concurrency: options.concurrency || 10,
            tempDir,
            maxImageSize: options.maxImageSize,
            imageDensity: options.imageDensity,
            imageHeight: options.imageHeight,
            correctOrientation: options.correctOrientation,
            trimEdges: options.trimEdges,
            directImageExtraction: options.directImageExtraction,
            extractionPrompt: options.extractionPrompt,
            extractOnly: options.extractOnly,
            extractPerPage: options.extractPerPage,
            pagesToConvertAsImages: options.pagesToConvertAsImages,
            prompt: options.prompt,
            schema: options.schema,
            maxTesseractWorkers: -1,
        }) as ZeroxOutput;

        // 合并所有页面内容
        const content = result.pages.map(page => page.content || "").join("\n");

        // 保存处理后的内容
        const outputPath = path.join(config.storage.path, `${documentId}.md`);
        await fs.writeFile(outputPath, content);

        const processingTime = Date.now() - startTime;

        return {
            success: true,
            documentId,
            content,
            metadata: {
                completionTime: result.completionTime,
                fileName: result.fileName,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                pages: result.pages.map((page: ZeroxPage) => ({
                    pageNumber: page.page,
                    content: page.content || "",
                    contentLength: page.contentLength || 0,
                })),
                processingTime
            }
        };
    } catch (error) {
        logger.error('ZeroX 文档处理失败', { error, filePath });

        return {
            success: false,
            documentId,
            error: error instanceof Error ? error.message : 'ZeroX 文档处理失败',
            metadata: {
                processingTime: Date.now() - startTime
            }
        };
    }
}

/**
 * 生成文档摘要
 */
export async function summarizeDocumentWithZerox(
    filePath: string,
    options: {
        model?: string;
        maxLength?: number;
        format?: "bullet" | "paragraph";
    } = {}
): Promise<ZeroxProcessResult> {
    const startTime = Date.now();
    const documentId = uuidv4();

    try {
        // 导入 zerox
        const { zerox } = await import('zerox');

        logger.info('开始使用 ZeroX 生成文档摘要', {
            filePath,
            documentId,
            model: options.model || ModelOptions.OPENAI_GPT_4O
        });

        // 构建提示词
        const format = options.format || "paragraph";
        const maxLength = options.maxLength || 500;
        const prompt = `请生成一个${format === "bullet" ? "要点列表" : "段落"}形式的文档摘要，长度不超过${maxLength}字。`;

        // 调用 zerox 处理文档
        const result = await zerox({
            filePath,
            modelProvider: ModelProvider.OPENAI,
            model: options.model || ModelOptions.OPENAI_GPT_4O,
            credentials: {
                apiKey: process.env.OPENAI_API_KEY || "",
            },
            prompt,
        }) as ZeroxOutput;

        // 合并所有页面内容
        const content = result.pages.map(page => page.content || "").join("\n");

        const processingTime = Date.now() - startTime;

        return {
            success: true,
            documentId,
            content,
            metadata: {
                completionTime: result.completionTime,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                processingTime
            }
        };
    } catch (error) {
        logger.error('ZeroX 文档摘要生成失败', { error, filePath });

        return {
            success: false,
            documentId,
            error: error instanceof Error ? error.message : 'ZeroX 文档摘要生成失败',
            metadata: {
                processingTime: Date.now() - startTime
            }
        };
    }
} 