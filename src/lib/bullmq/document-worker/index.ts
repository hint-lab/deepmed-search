import { createWorker } from '../queue-manager';
import { DocumentProcessJobData, DocumentProcessJobResult } from './types';
import { parseDocument } from '../../document-parser';
import { TaskType } from '../types';
import { Job } from 'bullmq';
import logger from '@/utils/logger';
import { getReadableUrl } from '../../minio/operations';
import { userDocumentContextStorage, UserDocumentContext } from '../../document-parser/user-context';
import { decryptApiKey } from '@/lib/crypto';
import { PrismaClient } from '@prisma/client';

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

        // 使用统一的文档解析器（根据 DOCUMENT_PARSER 环境变量自动选择）
        const result = await parseDocument(fileUrl, {
            fileName: documentInfo.name || filePath.split('/').pop() || 'document',
            maintainFormat: options.maintainFormat,
            prompt: options.prompt || '',
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
            // 从数据库加载用户的文档解析器配置（只查询一次）
            logger.info(`[Document Worker] Loading user config for user ${userId}, document ${documentId}`);

            const userConfig = await prisma.searchConfig.findUnique({
                where: { userId },
            });

            if (!userConfig) {
                throw new Error('未找到用户搜索配置。请访问 /settings/search 页面配置文档解析器');
            }

            // 构建用户文档处理上下文
            const documentContext: UserDocumentContext = {
                userId,
                documentParser: userConfig.documentParser as any,
                mineruApiKey: userConfig.mineruApiKey ? decryptApiKey(userConfig.mineruApiKey) : undefined,
            };

            logger.info(`[Document Worker] User ${userId} using parser: ${documentContext.documentParser}`);

            // 使用 AsyncLocalStorage 在隔离的上下文中运行文档处理任务
            return await userDocumentContextStorage.run(documentContext, async () => {
                // 更新进度：开始处理
                await job.updateProgress(10);

                const result = await processDocument(job.data);

                // 更新进度：处理完成
                await job.updateProgress(100);

                return result;
            });
        } catch (error) {
            logger.error(`[Document Worker] Document ${documentId} processing failed:`, error);
            // 更新进度：处理失败
            await job.updateProgress(-1);
            throw error;
        }
    }
); 