import { Job } from 'bullmq';
import { convertToMarkdownAction } from '@/actions/document';
import { revalidatePath } from 'next/cache';

/**
 * PDF处理队列处理器
 * 处理PDF相关操作，包括转换为Markdown等
 */
export async function pdfProcessingProcessor(job: Job) {
    console.log(`处理PDF任务: `, job.data);

    try {
        // 根据操作类型执行不同的处理逻辑
        const { operation, documentId } = job.data;

        if (operation === 'convert_to_markdown') {
            console.log(`开始转换文档 ${documentId} 为Markdown`);

            // 直接调用server action执行文档转换
            // server action内部会负责更新文档状态
            const result = await convertToMarkdownAction(documentId);

            if (result.success) {
                console.log(`文档 ${documentId} 转换完成`);
                return {
                    success: true,
                    operation,
                    documentId,
                    message: '文档转换成功'
                };
            } else {
                console.error(`文档 ${documentId} 转换失败:`, result.error);
                throw new Error(result.error || '文档转换失败');
            }
        } else {
            console.log(`未知的PDF处理操作: ${operation}`);
            return { processed: false, message: `未知操作: ${operation}` };
        }
    } catch (error) {
        console.error('PDF处理任务失败:', error);
        return {
            processed: false,
            error: error instanceof Error ? error.message : '未知错误',
            documentId: job.data.documentId
        };
    }
}

/**
 * 文档转换为Markdown处理器
 * 专门处理文档转换为Markdown的操作
 */
export async function documentConvertToMarkdownProcessor(job: Job) {
    console.log(`处理文档转换为Markdown任务: `, job.data);

    try {
        const { documentId } = job.data;
        console.log(`开始转换文档 ${documentId} 为Markdown`);

        // 直接调用server action执行文档转换
        // server action内部会负责所有状态更新
        const result = await convertToMarkdownAction(documentId);

        if (result.success) {
            console.log(`文档 ${documentId} 转换完成`);

            // 重新验证相关路径
            try {
                revalidatePath('/knowledge-base/[id]');
            } catch (err) {
                console.warn('无法重新验证路径:', err);
            }

            return {
                success: true,
                documentId,
                message: '文档转换成功'
            };
        } else {
            console.error(`文档 ${documentId} 转换失败:`, result.error);
            throw new Error(result.error || '文档转换失败');
        }
    } catch (error) {
        console.error('文档转换任务失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
            documentId: job.data.documentId
        };
    }
}

/**
 * 文档索引队列处理器
 * 处理文档索引相关操作
 */
export async function documentIndexingProcessor(job: Job) {
    console.log(`为文档建立索引: ${job.data.documentId}`);

    try {
        const { documentId } = job.data;

        // 这里应该调用相应的server action执行索引创建
        // TODO: 实现具体的索引建立过程

        return {
            indexed: true,
            documentId,
            message: '索引创建成功'
        };
    } catch (error) {
        console.error('索引建立失败:', error);
        return {
            indexed: false,
            error: error instanceof Error ? error.message : '未知错误',
            documentId: job.data.documentId
        };
    }
} 