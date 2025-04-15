import { createWorker } from '../queue-manager';
import { DocumentProcessJobData, DocumentProcessJobResult } from './types';
import { processDocumentWithZerox } from '../../zerox';
import { ModelProvider } from 'zerox/node-zerox/dist/types';
import { prisma } from '../../prisma';
import { TaskType } from '../types';
import { Job } from 'bullmq';
import logger from '@/utils/logger';
import { getReadableUrl } from '../../minio/operations';

// 文档处理函数
export async function processDocument(data: DocumentProcessJobData): Promise<DocumentProcessJobResult> {
    const { documentId, options } = data;

    try {
        // 从数据库获取文档信息
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                uploadFile: true
            }
        });

        if (!document) {
            throw new Error('文档不存在');
        }

        if (!document.uploadFile) {
            throw new Error('文档文件不存在');
        }

        // 修复文件路径，移除重复的 deepmed 目录
        const filePath = document.uploadFile.location.replace(/^deepmed\//, '');
        logger.info('处理文件路径', {
            documentId,
            originalPath: document.uploadFile.location,
            fixedPath: filePath
        });

        // 生成可读的 MinIO URL
        const fileUrl = await getReadableUrl('deepmed', filePath);
        logger.info('生成文件 URL', {
            documentId,
            fileUrl
        });

        // 使用 processDocumentWithZerox 处理文档
        const result = await processDocumentWithZerox(fileUrl, {
            modelProvider: ModelProvider.OPENAI,
            model: options.model,
            maintainFormat: options.maintainFormat,
            prompt: options.prompt || '',
            cleanup: true,
            concurrency: 10,
            maxImageSize: 15,
            imageDensity: 300,
            imageHeight: 2048,
            correctOrientation: true,
            trimEdges: true
        });

        return {
            success: true,
            data: {
                ...result,
                fileUrl // 添加文件 URL 到返回结果中
            }
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