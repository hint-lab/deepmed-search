'use server';

import { documentConvertProcessQueue, addJob, getJobStatus } from '@/lib/bullmq/queue-manager';
import { ServerActionResponse } from '@/types/actions';
import { DocumentProcessJobData } from '@/lib/bullmq/document-worker/types';
import { processDocument } from '@/lib/bullmq/document-worker';

// 直接处理文档的server action
export async function processDocumentDirectlyAction(
    documentId: string,
    options: {
        model: string;
        maintainFormat: boolean;
        prompt?: string;
    }
): Promise<ServerActionResponse<any>> {
    try {
        const result = await processDocument({
            documentId,
            options: {
                model: options.model,
                maintainFormat: options.maintainFormat,
                prompt: options.prompt
            }
        });

        return {
            success: true,
            data: result
        };
    } catch (error: any) {
        console.error('处理文档失败:', error);
        return {
            success: false,
            error: error.message || '处理文档失败'
        };
    }
}

// 添加到队列的server action
export async function processDocumentAction(
    documentId: string,
    options: {
        model: string;
        maintainFormat: boolean;
        prompt?: string;
    }
): Promise<ServerActionResponse<{ jobId: string }>> {
    try {
        // 添加任务到队列
        const job = await addJob<DocumentProcessJobData, any>(
            documentConvertProcessQueue,
            {
                documentId,
                options: {
                    model: options.model,
                    maintainFormat: options.maintainFormat,
                    prompt: options.prompt
                }
            }
        );

        if (!job.id) {
            throw new Error('任务ID不存在');
        }

        return {
            success: true,
            data: {
                jobId: job.id
            }
        };
    } catch (error: any) {
        console.error('添加文档处理任务失败:', error);
        return {
            success: false,
            error: error.message || '添加文档处理任务失败'
        };
    }
}

// 获取任务状态的server action
export async function getDocumentProcessStatusAction(
    jobId: string
): Promise<ServerActionResponse<any>> {
    try {
        const status = await getJobStatus(jobId);

        if (!status) {
            return {
                success: false,
                error: '任务不存在'
            };
        }

        return {
            success: true,
            data: status
        };
    } catch (error: any) {
        console.error('获取任务状态失败:', error);
        return {
            success: false,
            error: error.message || '获取任务状态失败'
        };
    }
} 