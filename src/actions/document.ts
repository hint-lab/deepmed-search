'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ServerActionResponse } from '@/types/actions';
import { IChangeParserConfigRequestBody, IDocumentMetaRequestBody } from '@/types/db/document';
import { ModelOptions } from 'zerox/node-zerox/dist/types';
import { agentManager } from '@/lib/agent-manager';
import { minioClient, uploadFileStream, fileExists } from '@/lib/minio';
import path from 'path';
import { Prisma } from '@prisma/client';
import { Readable } from 'stream';


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
                    createdAt: 'desc'
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
        failed_files: [] as Array<{ name: string; error: string }>
    };

    try {
        // 并行处理所有文件上传
        const uploadPromises = files.map(async (file) => {
            try {
                // 生成唯一的文件名
                const timestamp = Date.now();
                const uniqueFileName = `${timestamp}-${file.name}`;
                const filePath = `uploads/${kbId}/${uniqueFileName}`;

                // 检查文件是否已存在
                const exists = await fileExists(
                    process.env.MINIO_BUCKET_NAME || 'documents',
                    filePath
                );

                if (exists) {
                    throw new Error('文件已存在');
                }

                // 将文件内容转换为 Buffer
                const buffer = Buffer.from(await file.arrayBuffer());
                const stream = Readable.from(buffer);

                // 上传文件到 MinIO S3
                await uploadFileStream(
                    process.env.MINIO_BUCKET_NAME || 'documents',
                    filePath,
                    stream,
                    file.size,
                    {
                        'Content-Type': file.type,
                        'x-amz-meta-filename': file.name,
                        'x-amz-meta-kbid': kbId,
                        'x-amz-meta-upload-date': new Date().toISOString()
                    }
                );

                // 创建文档记录
                const fileData = await prisma.document.create({
                    data: {
                        name: file.name,
                        content: '',
                        knowledgeBaseId: kbId,
                        location: filePath,
                        size: file.size,
                        type: file.type,
                        source_type: 'file',
                        status: 'enabled',
                        chunk_num: 0,
                        token_num: 0,
                        progress: 0,
                        progress_msg: '文件上传成功',
                        run: 'pending',
                        process_begin_at: null,
                        process_duation: 0,
                        create_date: new Date(),
                        create_time: BigInt(Date.now()),
                        update_date: new Date(),
                        update_time: BigInt(Date.now()),
                        created_by: 'system',
                        parser_id: '',
                        parser_config: {}
                    }
                });

                results.success_count++;
                return fileData;
            } catch (error) {
                results.failed_count++;
                results.failed_files.push({
                    name: file.name,
                    error: error instanceof Error ? error.message : '上传失败'
                });
                console.error(`文件 ${file.name} 上传失败:`, error);
                return null;
            }
        });

        // 等待所有上传完成
        await Promise.all(uploadPromises);

        // 重新验证知识库页面
        revalidatePath(`/knowledge-base/${kbId}`);

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
                parser_config: parserConfig.parserConfig as Prisma.InputJsonValue
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
        // 更新文档元数据
        await prisma.document.update({
            where: { id: documentId },
            data: { parser_config: meta.meta as Prisma.InputJsonValue }
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
        // 删除文档记录
        await prisma.document.delete({
            where: { id: documentId }
        });

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

        // 获取文档处理代理
        const agent = agentManager.getDocumentAgent(documentId);

        // 解析文档并转换为Markdown
        const parseResponse = await agent.parseDocument(
            path.join(process.cwd(), document.location),
            document.name,
            {
                model: ModelOptions.OPENAI_GPT_4O,
                outputDir: path.join(process.cwd(), "output"),
                maintainFormat: true,
                cleanup: true,
                concurrency: 10
            }
        );

        // 更新文档内容和元数据
        await prisma.document.update({
            where: { id: documentId },
            data: {
                content: parseResponse.content,
                processing_status: 'completed',
                chunk_num: parseResponse.metadata.pages.length,
                token_num: parseResponse.metadata.outputTokens,
                update_date: new Date(),
                update_time: BigInt(Date.now())
            }
        });

        // 重新验证知识库页面
        revalidatePath('/knowledge-base/[id]');
        return {
            success: true,
            data: {
                content: parseResponse.content,
                metadata: parseResponse.metadata
            }
        };

    } catch (error) {
        console.error('转换为markdown失败:', error);
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

        // 解析文档并处理分块
        const parseResponse = await agentManager.getDocumentAgent(documentId).parseDocument(
            path.join(process.cwd(), document.location),
            document.name,
            {
                model: ModelOptions.OPENAI_GPT_4O,
                outputDir: path.join(process.cwd(), "output"),
                maintainFormat: true,
                cleanup: true,
                concurrency: 10
            }
        );

        // 更新文档内容和元数据
        await prisma.document.update({
            where: { id: documentId },
            data: {
                content: parseResponse.content,
                processing_status: 'completed',
                chunk_num: parseResponse.metadata.pages.length,
                token_num: parseResponse.metadata.outputTokens,
                update_date: new Date(),
                update_time: BigInt(Date.now())
            }
        });

        // 重新验证知识库页面
        revalidatePath('/knowledge-base/[id]');
        return {
            success: true,
            data: {
                content: parseResponse.content,
                metadata: parseResponse.metadata
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