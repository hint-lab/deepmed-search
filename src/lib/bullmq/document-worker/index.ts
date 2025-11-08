import { createWorker } from '../queue-manager';
import { DocumentProcessJobData, DocumentProcessJobResult } from './types';
import { processDocumentWithMinerU } from '../../mineru';
import { TaskType } from '../types';
import { Job } from 'bullmq';
import logger from '@/utils/logger';
import { getReadableUrl } from '../../minio/operations';
import { MinerUProcessResult } from '@/lib/mineru/types';
// 文档处理函数
export async function processDocument(data: DocumentProcessJobData): Promise<DocumentProcessJobResult> {
    const { documentId, options, documentInfo } = data;

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

        // 使用 MinerU 处理文档
        const result: MinerUProcessResult = await processDocumentWithMinerU(fileUrl, {
            fileName: documentInfo.name || filePath.split('/').pop() || 'document',
            maintainFormat: options.maintainFormat,
            prompt: options.prompt || '',
        });
        
        // 转换 MinerUProcessResult 到 DocumentProcessJobResult 格式
        return {
            success: result.success,
            data: result.success && result.data ? {
                pages: result.data.pages?.map(page => ({
                    content: page.content,
                    contentLength: page.content.length,
                })),
                extracted: result.data.extracted,
                summary: result.data.pages ? {
                    totalPages: result.data.pages.length,
                    ocr: {
                        successful: result.data.pages.length,
                        failed: 0,
                    },
                    extracted: result.data.extracted,
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
        try {
            // 更新进度：开始处理
            await job.updateProgress(10);

            const result = await processDocument(job.data);

            // 更新进度：处理完成
            await job.updateProgress(100);

            return result;
        } catch (error) {
            // 更新进度：处理失败
            await job.updateProgress(-1);
            throw error;
        }
    }
); 