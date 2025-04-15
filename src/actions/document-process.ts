'use server';

import { documentConvertProcessQueue, addJob, getJobStatus } from '@/lib/bullmq/queue-manager';
import { ServerActionResponse } from '@/types/actions';
import { DocumentProcessJobData } from '@/lib/bullmq/document-worker/types';
import { processDocument } from '@/lib/bullmq/document-worker';
import { ProcessResult } from '@/lib/zerox/types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Page {
    pageNumber: number;
    content: string;
    contentLength?: number;
}

// 直接处理文档的server action
export async function processDocumentDirectlyAction(
    documentId: string,
    options: {
        model: string;
        maintainFormat: boolean;
        prompt?: string;
    }
): Promise<ServerActionResponse<ProcessResult>> {
    try {
        const result = await processDocument({
            documentId,
            options: {
                model: options.model,
                maintainFormat: options.maintainFormat,
                prompt: options.prompt
            }
        });

        if (!result.success) {
            return {
                success: false,
                error: result.error || '处理文档失败'
            };
        }

        // 保存处理结果到 Chunk 表
        console.log('开始创建 chunks，文档ID:', documentId);
        console.log('处理结果:', JSON.stringify(result.data, null, 2));

        // 获取文档信息
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: { knowledgeBaseId: true, name: true }
        });

        if (!document) {
            console.error('文档不存在:', documentId);
            throw new Error('文档不存在');
        }

        const chunks = result.data.pages?.map((page: Page) => {
            const chunk = {
                chunk_id: `${documentId}-${page.pageNumber}`,
                content_with_weight: page.content || '',
                available_int: 1,
                doc_id: documentId,
                doc_name: document.name || result.data.fileName || '未知文档',
                positions: {
                    pageNumber: page.pageNumber,
                    contentLength: page.content?.length || 0,
                    processingTime: result.data.processingTime,
                    completionTime: result.data.completionTime,
                    inputTokens: result.data.inputTokens,
                    outputTokens: result.data.outputTokens,
                    model: options.model,
                    maintainFormat: options.maintainFormat,
                    prompt: options.prompt
                },
                important_kwd: [],
                question_kwd: [],
                tag_kwd: [],
                kb_id: document.knowledgeBaseId,
                tag_feas: null
            };
            console.log('创建 chunk:', JSON.stringify(chunk, null, 2));
            return chunk;
        }) || [];

        console.log('准备批量创建 chunks，数量:', chunks.length);

        try {
            // 批量创建 chunks
            const result = await prisma.chunk.createMany({
                data: chunks,
                skipDuplicates: true // 跳过已存在的记录
            });
            console.log('Chunks 创建结果:', result);
        } catch (error) {
            console.error('创建 chunks 失败:', error);
            throw error;
        }

        // 更新文档的 chunk_num
        await prisma.document.update({
            where: { id: documentId },
            data: {
                chunk_num: chunks.length,
                processing_status: 'PROCESSED'
            }
        });

        // 确保返回的数据格式正确
        return {
            success: true,
            data: {
                success: true,
                data: result.data,
                metadata: {
                    processingTime: result.data.processingTime,
                    documentId: documentId,
                    completionTime: result.data.completionTime,
                    fileName: result.data.fileName,
                    inputTokens: result.data.inputTokens,
                    outputTokens: result.data.outputTokens,
                    pageCount: result.data.pages?.length || 0,
                    pages: result.data.pages?.map((page: Page) => ({
                        pageNumber: page.pageNumber,
                        content: page.content,
                        contentLength: page.content?.length || 0
                    })),
                    wordCount: result.data.wordCount
                }
            }
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