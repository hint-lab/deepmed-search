'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ServerActionResponse } from '@/types/actions';
import { IChangeParserConfigRequestBody } from '@/types/parser-config';
import { IDocumentMetaRequestBody } from '@/types/db/document';
import { ModelOptions } from 'zerox/node-zerox/dist/types';
import { Prisma } from '@prisma/client';
import { uploadFileAction } from './file-upload';
import { DocumentProcessingStatus } from '@/types/db/enums';

/**
 * 获取文档列表
 * @param kbId - 知识库ID
 * @param page - 页码，默认1
 * @param pageSize - 每页数量，默认10
 * @param keywords - 搜索关键词，可选
 * @returns 文档列表和总数
 */
export async function getDocumentListAction(kbId: string, page: number = 1, pageSize: number = 10, keywords?: string): Promise<ServerActionResponse<any>> {
    try {
        // 计算分页偏移量
        const skip = (page - 1) * pageSize;

        // 构建查询条件
        const where: Prisma.DocumentWhereInput = {
            knowledgeBaseId: kbId,
            ...(keywords ? {
                name: {
                    contains: keywords,
                    mode: 'insensitive' as const
                }
            } : {})
        };

        // 并行查询总数和文档列表
        const [total, docs] = await Promise.all([
            prisma.document.count({ where }),
            prisma.document.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: {
                    create_date: 'desc'
                }
            })
        ]);

        // 格式化返回数据
        return {
            success: true,
            data: {
                items: docs.map(doc => ({
                    id: doc.id,
                    name: doc.name,
                    content_url: doc.content_url,
                    file_url: doc.file_url,
                    size: doc.size,
                    type: doc.type,
                    source_type: doc.source_type,
                    processing_status: doc.processing_status,
                    thumbnail: doc.thumbnail,
                    chunk_num: doc.chunk_num,
                    token_num: doc.token_num,
                    progress: doc.progress,
                    progress_msg: doc.progress_msg,
                    process_begin_at: doc.process_begin_at?.toISOString(),
                    process_duation: doc.process_duation,
                    create_date: doc.create_date.toISOString(),
                    create_time: doc.create_time.toString(),
                    update_date: doc.update_date.toISOString(),
                    update_time: doc.update_time.toString(),
                    created_by: doc.created_by,
                    knowledgeBaseId: doc.knowledgeBaseId,
                    parser_id: doc.parser_id,
                    parser_config: doc.parser_config,
                    markdown_content: doc.markdown_content,
                    summary: doc.summary,
                    metadata: doc.metadata,
                    processing_error: doc.processing_error,
                    enabled: doc.enabled,
                    uploadFileId: doc.uploadFileId
                })),
                total: total
            }
        };
    } catch (error) {
        console.error('获取文档列表失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '获取文档列表失败'
        };
    }
}

/**
 * 修改文档的解析器配置
 * @param documentId - 文档ID
 * @param parserId - 解析器ID
 * @param parserConfig - 解析器配置
 * @returns 更新结果
 */
export async function changeDocumentParserAction(
    documentId: string,
    parserId: string,
    parserConfig: IChangeParserConfigRequestBody
): Promise<ServerActionResponse<any>> {
    try {
        // 更新文档的解析器配置
        await prisma.document.update({
            where: { id: documentId },
            data: {
                parser_id: parserId,
                parser_config: parserConfig as unknown as Prisma.InputJsonValue
            }
        });

        // 重新验证知识库页面
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
}

/**
 * 重命名文档
 * @param documentId - 文档ID
 * @param name - 新名称
 * @returns 重命名结果
 */
export async function renameDocumentAction(documentId: string, name: string): Promise<ServerActionResponse<any>> {
    try {
        // 更新文档名称
        await prisma.document.update({
            where: { id: documentId },
            data: { name }
        });

        // 重新验证知识库页面
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
}

/**
 * 设置文档元数据
 * @param documentId - 文档ID
 * @param meta - 元数据对象
 * @returns 更新结果
 */
export async function setDocumentMetaAction(documentId: string, meta: IDocumentMetaRequestBody): Promise<ServerActionResponse<any>> {
    try {
        // 解析元数据字符串
        const metaData = JSON.parse(meta.metadata);

        // 准备更新数据
        const updateData: any = {};

        // 如果元数据中包含 enabled 字段，则更新 enabled 字段
        if (metaData.enabled !== undefined) {
            updateData.enabled = metaData.enabled;
        }

        // 更新文档元数据
        await prisma.document.update({
            where: { id: documentId },
            data: updateData
        });

        // 重新验证知识库页面
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
}

/**
 * 删除文档
 * @param documentId - 文档ID
 * @returns 删除结果
 */
export async function deleteDocumentAction(documentId: string): Promise<ServerActionResponse<any>> {
    try {
        // 获取文档信息
        const document = await prisma.document.findUnique({
            where: { id: documentId }
        });

        if (!document) {
            return { success: false, error: '文档不存在' };
        }

        // 保存上传文件ID，以便在删除文档后删除文件
        const uploadFileId = document.uploadFileId;

        // 先删除关联的 chunks
        await prisma.chunk.deleteMany({
            where: { doc_id: documentId }
        });

        // 删除文档记录
        await prisma.document.delete({
            where: { id: documentId }
        });

        // 删除上传文件
        if (uploadFileId) {
            await prisma.uploadFile.delete({
                where: { id: uploadFileId }
            });
        }

        return { success: true };
    } catch (error) {
        console.error('删除文档失败:', error);
        return { success: false, error: '删除文档失败' };
    }
}

/**
 * 上传文档到知识库
 * @param kbId - 知识库ID
 * @param files - 要上传的文件数组
 * @returns 上传结果，包含成功和失败的数量
 */
export async function uploadDocumentAction(kbId: string, files: File[]): Promise<ServerActionResponse<any>> {
    const results = {
        success_count: 0,
        failed_count: 0,
        failed_documents: [] as Array<{ name: string; error: string }>,
        documents: [] as Array<any>  // 添加文档数组
    };

    try {
        // 检查知识库是否存在
        const knowledgeBase = await prisma.knowledgeBase.findUnique({
            where: { id: kbId }
        });

        if (!knowledgeBase) {
            return {
                success: false,
                error: `知识库不存在: ${kbId}`,
                data: results
            };
        }

        // 并行处理所有文件上传
        const uploadPromises = files.map(async (file) => {
            try {
                // 使用 uploadFileAction 上传文件
                const uploadResult = await uploadFileAction(file, "KB");

                if (!uploadResult.success) {
                    throw new Error(uploadResult.error || '文件上传失败');
                }

                const uploadFile = uploadResult.data;

                // 创建文档记录
                const document = await prisma.document.create({
                    data: {
                        name: file.name,
                        content_url: uploadFile.location,
                        knowledgeBaseId: kbId,
                        size: file.size,
                        type: file.type,
                        source_type: 'file',
                        processing_status: DocumentProcessingStatus.UNPROCESSED,
                        chunk_num: 0,
                        token_num: 0,
                        progress: 0,
                        progress_msg: '文件上传成功',
                        process_begin_at: null,
                        process_duation: 0,
                        create_date: new Date(),
                        create_time: BigInt(Date.now()),
                        update_date: new Date(),
                        update_time: BigInt(Date.now()),
                        created_by: knowledgeBase.created_by,
                        parser_id: knowledgeBase.parser_id || '',
                        parser_config: knowledgeBase.parser_config || {},
                        uploadFileId: uploadFile.id
                    }
                });

                // 更新知识库的文档数量
                await prisma.knowledgeBase.update({
                    where: { id: kbId },
                    data: {
                        doc_num: {
                            increment: 1
                        }
                    }
                });

                results.success_count++;
                results.documents.push(document);  // 将文档添加到结果中
                return document;
            } catch (error) {
                results.failed_count++;
                results.failed_documents.push({
                    name: file.name,
                    error: error instanceof Error ? error.message : '上传失败'
                });
                console.error(`文件 ${file.name} 上传失败:`, error);
                return null;
            }
        });

        // 等待所有上传完成
        await Promise.all(uploadPromises);

        return {
            success: true,
            data: results
        };
    } catch (error) {
        console.error('上传文档失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '上传失败',
            data: results
        };
    }
}
