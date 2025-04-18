'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ServerActionResponse } from '@/types/actions';
import { IChangeParserConfigRequestBody } from '@/types/parser-config';
import { IDocumentMetaRequestBody } from '@/types/db/document';
import { ModelOptions } from 'zerox/node-zerox/dist/types';
import { agentManager } from '@/lib/agent-manager';
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
                    chunk_count: doc.chunk_num || 0,
                    enabled: doc.enabled,
                    processing_status: doc.processing_status
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
        const metaData = JSON.parse(meta.meta);

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
        // 查找文档记录
        const document = await prisma.document.findUnique({
            where: { id: documentId }
        });

        if (!document) {
            return {
                success: false,
                error: '文档不存在',
            };
        }

        // 保存上传文件ID，以便在删除文档后删除文件
        const uploadFileId = document.uploadFileId;

        // 删除文档记录
        await prisma.document.delete({
            where: { id: documentId }
        });

        // 如果文档有关联的上传文件，则删除该文件
        if (uploadFileId) {
            try {
                // 导入删除上传文件的函数
                const { deleteUploadFileAction } = await import('./file-upload');
                await deleteUploadFileAction(uploadFileId);
            } catch (error) {
                console.error('删除关联的上传文件失败:', error);
                // 继续执行，即使删除上传文件失败，文档记录已经被删除
            }
        }

        // 重新验证知识库页面
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
}

/**
 * 将文档转换为Markdown格式
 * @param documentId - 文档ID
 * @returns 转换结果，包含转换后的内容和元数据
 */
export async function convertToMarkdownAction(documentId: string): Promise<ServerActionResponse<any>> {
    try {
        // 获取文档信息
        const document = await prisma.document.findUnique({
            where: { id: documentId }
        });
        if (!document) {
            throw new Error('文档不存在');
        }

        // 首先更新文档状态为处理中
        await prisma.document.update({
            where: { id: documentId },
            data: {
                processing_status: DocumentProcessingStatus.PROCESSING,
                update_date: new Date(),
                update_time: BigInt(Date.now())
            }
        });

        // 获取文档处理代理
        const agent = agentManager.getDocumentAgent(documentId);
        console.log("convertToMarkdownAction", document)

        // 获取上传文件信息
        const uploadFile = document.uploadFileId ? await prisma.uploadFile.findUnique({
            where: { id: document.uploadFileId }
        }) : null;

        if (!uploadFile) {
            throw new Error('未找到上传文件信息');
        }

        const parseResponse = await agent.parseDocument(
            uploadFile.location,
            document.name,
            {
                model: ModelOptions.OPENAI_GPT_4O,
                maintainFormat: true,
                cleanup: true,
                concurrency: 10
            }
        );

        const content = parseResponse.content;

        // 为页面内容创建摘要
        const summary = `文档 ${document.name} 包含 ${parseResponse.metadata.pages.length} 页，共 ${parseResponse.metadata.inputTokens} 个标记`;

        // 准备元数据
        const metadata = {
            completionTime: parseResponse.metadata.completionTime,
            inputTokens: parseResponse.metadata.inputTokens,
            outputTokens: parseResponse.metadata.outputTokens,
            pageCount: parseResponse.metadata.pages.length,
            modelName: ModelOptions.OPENAI_GPT_4O,
        };

        // 获取知识库ID
        const knowledgeBaseId = document.knowledgeBaseId;

        if (!knowledgeBaseId) {
            throw new Error("未找到有效的知识库");
        }

        // 更新文档内容和元数据
        await prisma.document.update({
            where: { id: documentId },
            data: {
                processing_status: DocumentProcessingStatus.PROCESSED,
                chunk_num: parseResponse.metadata.pages.length,
                token_num: parseResponse.metadata.inputTokens,
                progress: 100,
                progress_msg: "解析完成",
                process_duation: parseResponse.metadata.completionTime,
                update_date: new Date(),
                update_time: BigInt(Date.now()),
                markdown_content: content,
                summary: summary,
                metadata: metadata
            }
        });

        // 删除旧的分块（如果有）
        await prisma.chunk.deleteMany({
            where: {
                doc_id: documentId
            }
        });

        // 保存每一页作为单独的块
        for (const page of parseResponse.metadata.pages) {
            const pageContent = page.content || "";

            if (pageContent.trim().length > 0) {
                // 为每个块生成唯一ID
                const chunkId = `${documentId}-page-${page.pageNumber}`;

                await prisma.chunk.create({
                    data: {
                        chunk_id: chunkId,
                        content_with_weight: pageContent,
                        available_int: 1,
                        doc_id: documentId,
                        doc_name: document.name,
                        positions: { page: page.pageNumber },
                        important_kwd: [],
                        question_kwd: [],
                        tag_kwd: [],
                        kb_id: knowledgeBaseId
                    }
                });
            }
        }

        // 更新知识库的chunk_num和doc_num
        await prisma.knowledgeBase.update({
            where: {
                id: knowledgeBaseId
            },
            data: {
                chunk_num: {
                    increment: parseResponse.metadata.pages.length
                },
                token_num: {
                    increment: parseResponse.metadata.inputTokens
                },
                update_date: new Date(),
                update_time: BigInt(Date.now())
            }
        });

        // 重新验证知识库页面 - 使用更精确的路径以减少不必要的刷新
        revalidatePath(`/knowledge-base/${knowledgeBaseId}/document/${documentId}`);

        return {
            success: true,
            data: {
                content: content,
                metadata: {
                    ...parseResponse.metadata,
                    documentId: documentId,
                    savedToDatabase: true
                }
            }
        };

    } catch (error) {
        console.error('转换为markdown失败:', error);

        // 更新文档状态为失败
        try {
            await prisma.document.update({
                where: { id: documentId },
                data: {
                    processing_status: DocumentProcessingStatus.FAILED,
                    progress_msg: error instanceof Error ? error.message : '转换失败',
                    update_date: new Date(),
                    update_time: BigInt(Date.now())
                }
            });
        } catch (updateError) {
            console.error('更新文档状态失败:', updateError);
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : '转换失败'
        };
    }
}

/**
 * 处理文档分块
 * @param documentId - 文档ID
 * @returns 处理结果，包含处理后的内容和元数据
 */
export async function processDocumentToChunksAction(documentId: string): Promise<ServerActionResponse<any>> {
    try {
        // 获取文档信息
        const document = await prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document) {
            return {
                success: false,
                error: '文档不存在',
            };
        }

        // 获取上传文件信息
        const uploadFile = document.uploadFileId ? await prisma.uploadFile.findUnique({
            where: { id: document.uploadFileId }
        }) : null;

        if (!uploadFile) {
            return {
                success: false,
                error: '未找到上传文件信息',
            };
        }

        // 解析文档，不进行数据库操作
        console.log(uploadFile.location)
        const parseResponse = await agentManager.getDocumentAgent(documentId).parseDocument(
            uploadFile.location,
            document.name,
            {
                model: ModelOptions.OPENAI_GPT_4O_MINI,
                maintainFormat: true,
                cleanup: true,
                concurrency: 10
            }
        );

        // 直接在server action中处理数据库操作
        const content = parseResponse.content;
        const markdown_content = true ? content : null; // 保持格式

        // 为页面内容创建摘要
        const summary = `文档 ${document.name} 包含 ${parseResponse.metadata.pages.length} 页，共 ${parseResponse.metadata.inputTokens} 个标记`;

        // 准备元数据
        const metadata = {
            completionTime: parseResponse.metadata.completionTime,
            inputTokens: parseResponse.metadata.inputTokens,
            outputTokens: parseResponse.metadata.outputTokens,
            pageCount: parseResponse.metadata.pages.length,
            modelName: ModelOptions.OPENAI_GPT_4O_MINI,
        };

        // 获取知识库ID
        const knowledgeBaseId = document.knowledgeBaseId;

        if (!knowledgeBaseId) {
            throw new Error("未找到有效的知识库");
        }

        // 更新文档信息
        await prisma.document.update({
            where: { id: documentId },
            data: {
                processing_status: DocumentProcessingStatus.PROCESSED,
                chunk_num: parseResponse.metadata.pages.length,
                token_num: parseResponse.metadata.inputTokens,
                progress: 100,
                progress_msg: "解析完成",
                process_duation: parseResponse.metadata.completionTime,
                update_date: new Date(),
                update_time: BigInt(Date.now()),
                markdown_content: markdown_content,
                summary: summary,
                metadata: metadata
            }
        });

        // 删除旧的分块（如果有）
        await prisma.chunk.deleteMany({
            where: {
                doc_id: documentId
            }
        });

        // 保存每一页作为单独的块
        for (const page of parseResponse.metadata.pages) {
            const pageContent = page.content || "";

            if (pageContent.trim().length > 0) {
                // 为每个块生成唯一ID
                const chunkId = `${documentId}-page-${page.pageNumber}`;

                await prisma.chunk.create({
                    data: {
                        chunk_id: chunkId,
                        content_with_weight: pageContent,
                        available_int: 1,
                        doc_id: documentId,
                        doc_name: document.name,
                        positions: { page: page.pageNumber },
                        important_kwd: [],
                        question_kwd: [],
                        tag_kwd: [],
                        kb_id: knowledgeBaseId
                    }
                });
            }
        }

        // 更新知识库的chunk_num和doc_num
        await prisma.knowledgeBase.update({
            where: {
                id: knowledgeBaseId
            },
            data: {
                chunk_num: {
                    increment: parseResponse.metadata.pages.length
                },
                token_num: {
                    increment: parseResponse.metadata.inputTokens
                },
                update_date: new Date(),
                update_time: BigInt(Date.now())
            }
        });

        // 重新验证知识库页面 - 使用更精确的路径以减少不必要的刷新
        revalidatePath(`/knowledge-base/${knowledgeBaseId}/document/${documentId}`);

        return {
            success: true,
            data: {
                content: content,
                metadata: {
                    ...parseResponse.metadata,
                    documentId: documentId,
                    savedToDatabase: true
                }
            }
        };

    } catch (error) {
        console.error('处理文档分块失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '处理文档分块失败',
        };
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
