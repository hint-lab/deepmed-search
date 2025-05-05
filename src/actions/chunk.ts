'use server';

import { prisma } from '@/lib/prisma';
import { ServerActionResponse } from '@/types/actions';
import { revalidatePath } from 'next/cache';
import logger from '@/utils/logger';

/**
 * 获取文档的所有分块
 * @param documentId - 文档ID
 * @returns 文档信息和分块列表
 */
export async function getDocumentChunksAction(documentId: string): Promise<ServerActionResponse<any>> {
    try {
        // 获取文档信息
        const document = await prisma.document.findUnique({
            where: { id: documentId }
        });

        if (!document) {
            return {
                success: false,
                error: '文档不存在'
            };
        }

        // 获取文档的所有分块
        const chunks = await prisma.chunk.findMany({
            where: { doc_id: documentId },
            orderBy: { chunk_id: 'asc' }
        });

        logger.info(`[getDocumentChunksAction] Fetched ${chunks.length} chunks from DB for doc ${documentId}.`, { documentId });

        const mappedChunks = chunks.map(chunk => ({
            id: chunk.id,
            chunk_id: chunk.chunk_id,
            doc_id: chunk.doc_id,
            content_with_weight: chunk.content_with_weight,
            available_int: chunk.available_int,
            doc_name: chunk.doc_name,
            img_id: chunk.img_id,
            important_kwd: chunk.important_kwd,
            question_kwd: chunk.question_kwd,
            tag_kwd: chunk.tag_kwd,
            positions: chunk.positions,
            tag_feas: chunk.tag_feas,
            kb_id: chunk.kb_id,
            createdAt: chunk.createdAt,
            updatedAt: chunk.updatedAt
        }));

        logger.info(`[getDocumentChunksAction] Returning ${mappedChunks.length} mapped chunks for doc ${documentId}.`, { documentId });

        return {
            success: true,
            data: {
                document,
                chunks: mappedChunks
            }
        };
    } catch (error) {
        console.error('获取文档分块失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '获取文档分块失败'
        };
    }
}

/**
 * 切换 Chunk 的可用状态
 * @param chunkId - Chunk ID
 * @param available - 新的可用状态 (true for 1, false for 0)
 * @returns 更新结果
 */
export async function toggleChunkAvailabilityAction(chunkId: string, available: boolean): Promise<ServerActionResponse<any>> {
    try {
        const chunk = await prisma.chunk.findUnique({
            where: { id: chunkId },
            select: { doc_id: true }
        });

        if (!chunk) {
            return { success: false, error: '分块不存在' };
        }

        await prisma.chunk.update({
            where: { id: chunkId },
            data: {
                available_int: available ? 1 : 0
            }
        });

        revalidatePath(`/chunks/${chunk.doc_id}`);

        return { success: true };
    } catch (error) {
        console.error('切换分块可用状态失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '更新失败'
        };
    }
} 