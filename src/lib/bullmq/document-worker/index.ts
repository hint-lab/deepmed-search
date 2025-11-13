import { createWorker, addTask } from '../queue-manager';
import { DocumentProcessJobData, DocumentProcessJobResult } from './types';
import { parseDocument } from '../../document-parser';
import { TaskType } from '../types';
import { Job } from 'bullmq';
import logger from '@/utils/logger';
import { getReadableUrl, uploadFileStream, getFileUrl } from '../../minio/operations';
import { userDocumentContextStorage, UserDocumentContext } from '../../document-parser/user-context';
import { decryptApiKey } from '@/lib/crypto';
import { PrismaClient } from '@prisma/client';
import { IDocumentProcessingStatus } from '@/types/enums';
import {
    updateDocumentProgress,
    updateDocumentStatus,
    reportDocumentError,
    reportDocumentComplete
} from '@/lib/document-tracker';
import { ChunkIndexJobData } from '../chunk-worker/types';
import { normalizeLanguage } from '@/constants/language';
import { Readable } from 'stream';

const prisma = new PrismaClient();

// 文档处理函数
export async function processDocument(data: DocumentProcessJobData): Promise<DocumentProcessJobResult> {
    const { documentId, userId, options, documentInfo } = data;

    try {
        if (!documentInfo || !documentInfo.uploadFile) {
            throw new Error('文档信息不完整');
        }

        // 修复文件路径，移除重复的 deepmed 目录
        const filePath = documentInfo.uploadFile.location.replace(/^deepmed\//, '');
        logger.info('处理文件路径', {
            documentId,
            originalPath: documentInfo.uploadFile.location,
            fixedPath: filePath
        });

        // 生成可读的 MinIO URL
        const fileUrl = await getReadableUrl('deepmed', filePath);
        logger.info('生成文件 URL', {
            documentId,
            fileUrl
        });

        // 使用统一的文档解析器（从用户配置中获取）
        const result = await parseDocument(fileUrl, {
            fileName: documentInfo.name || filePath.split('/').pop() || 'document',
            maintainFormat: options.maintainFormat,
            prompt: options.prompt || '',
            documentId: documentId, // 传递 documentId 用于图片上传
            language: options.language,
        });

        // 转换 DocumentParseResult 到 DocumentProcessJobResult 格式
        return {
            success: result.success,
            data: result.success ? {
                pages: result.pages?.map(page => ({
                    content: page.content,
                    contentLength: page.content.length,
                })),
                extracted: result.content || '',
                summary: result.pages ? {
                    totalPages: result.pages.length,
                    ocr: {
                        successful: result.pages.length,
                        failed: 0,
                    },
                    extracted: result.content || '',
                } : undefined,
            } : undefined,
            error: result.error || '',
            metadata: {
                ...result.metadata,
                fileUrl,
                language: options.language,
            },
        };
    } catch (error) {
        logger.error('文档处理失败', {
            documentId,
            error: error instanceof Error ? error.message : '未知错误',
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}

// 创建文档处理worker
export const documentWorker = createWorker<DocumentProcessJobData, DocumentProcessJobResult>(
    TaskType.DOCUMENT_CONVERT_TO_MD,
    async (job: Job<DocumentProcessJobData, DocumentProcessJobResult>) => {
        const { documentId, userId } = job.data;

        try {
            // 推送进度：开始加载配置
            await updateDocumentProgress(documentId, 5, '加载用户配置...');

            // 从数据库加载用户的文档解析器配置（只查询一次）
            logger.info(`[Document Worker] Loading user config for user ${userId}, document ${documentId}`);

            const userConfig = await prisma.searchConfig.findUnique({
                where: { userId },
            });

            if (!userConfig) {
                const errorMsg = '未找到用户搜索配置。请访问 /settings/document 页面配置文档解析器';
                await reportDocumentError(documentId, errorMsg);
                throw new Error(errorMsg);
            }

            // 构建用户文档处理上下文
            const documentContext: UserDocumentContext = {
                userId,
                documentParser: userConfig.documentParser as any,
                mineruApiKey: userConfig.mineruApiKey ? decryptApiKey(userConfig.mineruApiKey) : undefined,
            };

            logger.info(`[Document Worker] 📄 User ${userId.substring(0, 8)}... using parser: ${documentContext.documentParser}`);

            // 推送进度：开始处理文档
            await updateDocumentProgress(documentId, 10, '开始处理文档...');
            await updateDocumentStatus(documentId, IDocumentProcessingStatus.CONVERTING, '正在转换文档');
            // 注意：CONVERTING 状态不写入数据库，只通过 SSE 推送

            // 使用 AsyncLocalStorage 在隔离的上下文中运行文档处理任务
            const result = await userDocumentContextStorage.run(documentContext, async () => {
                // 更新进度：开始处理
                await job.updateProgress(10);

                // 推送进度：正在解析
                await updateDocumentProgress(documentId, 30, '正在解析文档内容...');

                const processResult = await processDocument(job.data);

                // 推送进度：解析完成
                await updateDocumentProgress(documentId, 40, '文档解析完成');

                // 更新进度：转换阶段完成
                await job.updateProgress(50);

                return processResult;
            });

            // 转换完成，保存转换结果到数据库
            if (result.success && result.data) {
                const doc = await prisma.document.findUnique({
                    where: { id: documentId },
                    select: {
                        process_begin_at: true,
                        knowledgeBaseId: true,
                        name: true
                    }
                });

                if (!doc || !doc.knowledgeBaseId) {
                    throw new Error(`文档 ${documentId} 缺少知识库ID`);
                }

                // 获取知识库配置
                const knowledgeBase = await prisma.knowledgeBase.findUnique({
                    where: { id: doc.knowledgeBaseId },
                    select: {
                        chunk_size: true,
                        overlap_size: true,
                        split_by: true,
                        language: true,
                    }
                });

                const jobLanguage = job.data.options.language || knowledgeBase?.language || undefined;
                const normalizedLanguage = normalizeLanguage(jobLanguage);

                const startTime = doc?.process_begin_at?.getTime() || Date.now();
                const duration = Math.floor((Date.now() - startTime) / 1000);

                // 将 markdown 内容上传到 MinIO
                let markdownUrl: string | null = null;
                const markdownContent = result.data.extracted || '';

                // 检查 markdown 内容是否为空
                if (!markdownContent || markdownContent.trim() === '') {
                    const errorMsg = `文档 ${documentId} 转换后的 markdown 内容为空，无法继续处理`;
                    logger.error(`[Document Worker] ${errorMsg}`);
                    await reportDocumentError(documentId, errorMsg);
                    throw new Error(errorMsg);
                }

                try {
                    const buffer = Buffer.from(markdownContent, 'utf8');
                    const stream = new Readable();
                    stream.push(buffer);
                    stream.push(null);

                    const objectName = `documents/${documentId}/markdown.md`;
                    await uploadFileStream({
                        bucketName: 'deepmed',
                        objectName,
                        stream,
                        size: buffer.length,
                        metaData: {
                            'content-type': 'text/markdown; charset=utf-8'
                        }
                    });

                    markdownUrl = await getFileUrl('deepmed', objectName);
                    logger.info(`[Document Worker] Markdown 内容已上传至 MinIO: ${markdownUrl}`, {
                        documentId,
                        markdownUrl,
                        contentLength: markdownContent.length
                    });
                } catch (error) {
                    const errorMsg = `上传 Markdown 内容到 MinIO 失败: ${error instanceof Error ? error.message : '未知错误'}`;
                    logger.error(`[Document Worker] ${errorMsg}`, { documentId, error });
                    await reportDocumentError(documentId, errorMsg);
                    throw error;
                }

                // 确保 markdown_url 已设置
                if (!markdownUrl) {
                    const errorMsg = `文档 ${documentId} 的 markdown_url 未设置，无法继续处理`;
                    logger.error(`[Document Worker] ${errorMsg}`);
                    await reportDocumentError(documentId, errorMsg);
                    throw new Error(errorMsg);
                }

                // 保存转换结果（markdown URL 存储在 markdown_url）
                // 如果 file_url 还没有设置，则从 metadata 中获取并保存
                const updateData: any = {
                    markdown_url: markdownUrl, // 存储 markdown 的 URL（必须设置）
                    processing_status: IDocumentProcessingStatus.CONVERTED, // 转换完成，可以开始索引
                    progress: 50,
                    progress_msg: '转换完成，等待分块索引',
                    process_duation: duration,
                };

                // 如果 file_url 为空且 metadata 中有 fileUrl，则设置它（处理旧数据）
                if (result.metadata?.fileUrl) {
                    const currentDoc = await prisma.document.findUnique({
                        where: { id: documentId },
                        select: { file_url: true }
                    });
                    if (!currentDoc?.file_url) {
                        updateData.file_url = result.metadata.fileUrl;
                        logger.info(`[Document Worker] 文档 ${documentId} 补充设置 file_url: ${result.metadata.fileUrl}`);
                    }
                }

                await prisma.document.update({
                    where: { id: documentId },
                    data: updateData
                });

                await updateDocumentStatus(documentId, IDocumentProcessingStatus.CONVERTED, '转换完成，等待分块索引');
                await updateDocumentProgress(documentId, 50, '转换完成，等待分块索引', {
                    converted: true,
                    language: normalizedLanguage,
                });
                logger.info(`[Document Worker] 文档 ${documentId} 转换完成，已保存内容，准备添加到分块索引队列`);

                // 将分块索引任务添加到队列
                const chunkIndexJobData: ChunkIndexJobData = {
                    documentId,
                    kbId: doc.knowledgeBaseId,
                    userId,
                    options: {
                        model: job.data.options.model,
                        maintainFormat: job.data.options.maintainFormat,
                        prompt: job.data.options.prompt,
                        documentName: doc.name,
                        maxChunkSize: knowledgeBase?.chunk_size || 2000,
                        overlapSize: knowledgeBase?.overlap_size || 200,
                        splitByParagraph: knowledgeBase?.split_by === 'paragraph' || knowledgeBase?.split_by === 'page',
                        language: jobLanguage,
                    }
                };

                const chunkJobId = await addTask(
                    TaskType.CHUNK_VECTOR_INDEX,
                    chunkIndexJobData,
                    `chunk-index-${documentId}`
                );

                logger.info(`[Document Worker] 文档 ${documentId} 的分块索引任务已添加到队列 (Job ID: ${chunkJobId})`);

                // 推送转换完成状态（使用 progress metadata 表示）
                await updateDocumentProgress(documentId, 50, '转换完成，等待分块索引', {
                    converted: true,
                    chunkJobId,
                    language: normalizedLanguage,
                });
            } else {
                // 转换失败
                await prisma.document.update({
                    where: { id: documentId },
                    data: {
                        processing_status: IDocumentProcessingStatus.FAILED,
                        progress: 0,
                        progress_msg: result.error || '转换失败',
                    }
                });
            }

            return result;
        } catch (error) {
            logger.error(`[Document Worker] Document ${documentId} processing failed:`, error);

            // 推送错误状态到 Redis
            const errorMsg = error instanceof Error ? error.message : '文档处理失败';
            await reportDocumentError(documentId, errorMsg);

            // 更新进度：处理失败
            await job.updateProgress(-1);
            throw error;
        }
    }
); 