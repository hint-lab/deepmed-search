'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { withAuth } from '@/lib/auth-utils';
import { APIResponse } from '@/types/api';
import { IChangeParserConfigRequestBody, IDocumentMetaRequestBody } from '@/types/db/document';
import { Prisma } from '@prisma/client';

export const getDocumentList = withAuth(async (session, kbId: string, page: number = 1, pageSize: number = 10, keywords?: string): Promise<APIResponse<any>> => {
    try {
        const skip = (page - 1) * pageSize;

        const where: Prisma.DocumentWhereInput = {
            knowledgeBaseId: kbId,
            ...(keywords ? {
                name: {
                    contains: keywords,
                    mode: 'insensitive' as const
                }
            } : {})
        };

        const [total, docs] = await Promise.all([
            prisma.document.count({ where }),
            prisma.document.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: {
                    createdAt: 'desc'
                }
            })
        ]);

        return {
            success: true,
            data: {
                docs: docs.map((doc: any) => ({
                    id: doc.id,
                    name: doc.name,
                    create_date: doc.create_date.toISOString(),
                    create_time: doc.create_time.toString(),
                    update_date: doc.update_date.toISOString(),
                    update_time: doc.update_time.toString(),
                    parser_id: doc.parser_id || '',
                    parser_config: doc.parser_config as any,
                    status: doc.status,
                    error_message: doc.progress_msg,
                    extension: doc.type,
                    size: doc.size,
                    page_count: doc.chunk_num || 0,
                    word_count: doc.token_num || 0,
                    chunk_count: doc.chunk_num || 0
                })),
                total
            }
        };
    } catch (error) {
        console.error('获取文档列表失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '获取文档列表失败'
        };
    }
});

export const uploadDocument = withAuth(async (session, kbId: string, files: File[]): Promise<APIResponse<any>> => {
    try {
        if (!session?.user?.id) {
            throw new Error('未登录');
        }

        const uploadedFiles = await Promise.all(
            files.map(async (file) => {
                const fileData = await prisma.document.create({
                    data: {
                        name: file.name,
                        content: '',
                        knowledgeBaseId: kbId,
                        location: `uploads/${file.name}`,
                        size: file.size,
                        type: file.type,
                        source_type: 'file',
                        status: 'enabled',
                        chunk_num: 0,
                        token_num: 0,
                        progress: 0,
                        progress_msg: '',
                        run: 'pending',
                        process_begin_at: null,
                        process_duation: 0,
                        create_date: new Date(),
                        create_time: BigInt(Date.now()),
                        update_date: new Date(),
                        update_time: BigInt(Date.now()),
                        created_by: session.user.id,
                        parser_id: '',
                        parser_config: {}
                    }
                });
                return fileData;
            })
        );

        revalidatePath(`/knowledge-base/${kbId}`);

        return {
            success: true,
            data: {
                success_count: uploadedFiles.length,
                failed_count: 0,
                failed_files: []
            }
        };
    } catch (error) {
        console.error('上传文档失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '上传失败'
        };
    }
});

export const changeDocumentParser = withAuth(async (
    session,
    documentId: string,
    parserId: string,
    parserConfig: IChangeParserConfigRequestBody
): Promise<APIResponse<any>> => {
    try {
        await prisma.document.update({
            where: { id: documentId },
            data: {
                parser_id: parserId,
                parser_config: parserConfig.parserConfig as Prisma.InputJsonValue
            }
        });

        revalidatePath('/knowledge-base/[id]');
        return {
            success: true
        };
    } catch (error) {
        console.error('修改分块方法失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '修改失败'
        };
    }
});

export const runDocument = withAuth(async (session, documentId: string, isRunning: boolean): Promise<APIResponse<any>> => {
    try {
        await prisma.document.update({
            where: { id: documentId },
            data: {
                run: isRunning ? 'processing' : 'pending',
                process_begin_at: isRunning ? new Date() : null
            }
        });

        revalidatePath('/knowledge-base/[id]');
        return {
            success: true
        };
    } catch (error) {
        console.error('运行文档失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '操作失败'
        };
    }
});

export const renameDocument = withAuth(async (session, documentId: string, name: string): Promise<APIResponse<any>> => {
    try {
        await prisma.document.update({
            where: { id: documentId },
            data: { name }
        });

        revalidatePath('/knowledge-base/[id]');
        return {
            success: true
        };
    } catch (error) {
        console.error('重命名文档失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '重命名失败'
        };
    }
});

export const setDocumentMeta = withAuth(async (session, documentId: string, meta: IDocumentMetaRequestBody): Promise<APIResponse<any>> => {
    try {
        await prisma.document.update({
            where: { id: documentId },
            data: { parser_config: meta.meta as Prisma.InputJsonValue }
        });

        revalidatePath('/knowledge-base/[id]');
        return {
            success: true
        };
    } catch (error) {
        console.error('设置文档元数据失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '设置失败'
        };
    }
});

export const deleteDocument = withAuth(async (session, documentId: string): Promise<APIResponse<any>> => {
    try {
        await prisma.document.delete({
            where: { id: documentId }
        });

        revalidatePath('/knowledge-base/[id]');
        return {
            success: true
        };
    } catch (error) {
        console.error('删除文档失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '删除失败'
        };
    }
}); 