'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { withAuth } from '@/lib/auth-utils';
import { ServerActionResponse } from '@/types/actions';
/**
 * 获取知识库列表
 */
export async function getKnowledgeBaseListAction(): Promise<ServerActionResponse<any>> {
    try {
        const kbs = await prisma.knowledgeBase.findMany({
            orderBy: {
                create_date: 'desc'
            }
        });
        return {
            success: true,
            data: kbs
        };
    } catch (error) {
        console.error('Failed to get knowledge base list:', error);
        return {
            success: false,
            error: '获取知识库列表失败'
        };
    }
}

/**
 * 获取知识库详情
 * @param id 知识库ID
 * @returns 知识库详情数据
 */
export const getKnowledgeBaseDetailAction = withAuth(async (session, id: string) => {
    const kb = await prisma.knowledgeBase.findUnique({
        where: { id },
        include: {
            documents: true,
            tags: true,
        },
    });

    if (!kb) {
        return { success: false, error: '知识库不存在' };
    }

    return { success: true, data: kb };
});

/**
 * 获取知识库列表
 * @param params 查询参数
 * @returns 知识库列表数据
 */
export const getKnowledgeListAction = withAuth(async (session, params?: { page?: number; pageSize?: number; keywords?: string }) => {
    const { page = 1, pageSize = 10, keywords } = params || {};
    const where = keywords ? {
        name: {
            contains: keywords,
        },
    } : {};

    const [total, items] = await Promise.all([
        prisma.knowledgeBase.count({ where }),
        prisma.knowledgeBase.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    return { success: true, data: { total, items } };
});

// 添加自定义序列化函数
function serializeBigIntAction(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (Array.isArray(obj)) return obj.map(serializeBigIntAction);
    if (typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
            result[key] = serializeBigIntAction(obj[key]);
        }
        return result;
    }
    return obj;
}

export const createKnowledgeBaseAction = withAuth(async (session, params: { name: string, description?: string }) => {
    try {
        const knowledgeBase = await prisma.knowledgeBase.create({
            data: {
                name: params.name,
                description: params.description,
                create_date: new Date(),
                update_date: new Date(),
                create_time: BigInt(Date.now()),
                update_time: BigInt(Date.now()),
                created_by: session.user.id,
            },
        });

        revalidatePath('/knowledge-base');
        return { success: true, data: serializeBigIntAction(knowledgeBase) };
    } catch (error) {
        console.error('创建知识库失败:', error);
        return { success: false, error: '创建知识库失败' };
    }
});

export const updateKnowledgeBaseAction = withAuth(async (session, id: string, name: string) => {
    const knowledgeBase = await prisma.knowledgeBase.update({
        where: { id },
        data: { name },
    });

    revalidatePath('/knowledge-base');
    return { success: true, data: knowledgeBase };
});

export const deleteKnowledgeBaseAction = withAuth(async (session, id: string) => {
    await prisma.knowledgeBase.delete({
        where: { id },
    });

    revalidatePath('/knowledge-base');
    return { success: true };
});

export const getKnowledgeBaseAction = withAuth(async (session, id: string) => {
    const knowledgeBase = await prisma.knowledgeBase.findUnique({
        where: { id },
        include: {
            documents: true,
            tags: true,
        }
    });

    if (!knowledgeBase) {
        return { success: false, error: '知识库不存在' };
    }

    return { success: true, data: serializeBigIntAction(knowledgeBase) };
});

export const listKnowledgeBasesAction = withAuth(async (session, params?: {
    keyword?: string;
    page?: number;
    pageSize?: number;
    tags?: string[];
}) => {
    const { keyword, page = 1, pageSize = 10, tags } = params || {};
    const where: any = {
        visible: true // 默认只查询可见的知识库
    };

    if (keyword) {
        where.name = {
            contains: keyword,
            mode: 'insensitive'
        };
    }

    if (tags && tags.length > 0) {
        where.tags = {
            some: {
                name: {
                    in: tags
                }
            }
        };
    }

    const [total, items] = await Promise.all([
        prisma.knowledgeBase.count({ where }),
        prisma.knowledgeBase.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
            include: {
                tags: true,
                documents: {
                    select: {
                        id: true
                    }
                }
            }
        }),
    ]);

    return {
        success: true,
        data: {
            items: serializeBigIntAction(items),
            total,
            page,
            pageSize
        }
    };
});

export async function listTagAction(knowledgeBaseId: string) {
    return withAuth(async (session) => {
        const tags = await prisma.tag.findMany({
            where: {
                knowledgeBaseId,
            },
            include: {
                _count: {
                    select: {
                        documents: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return {
            success: true,
            data: tags.map(tag => [tag.name, tag._count.documents] as [string, number]),
        };
    });
}

export async function listTagByKnowledgeIdsAction(knowledgeBaseIds: string) {
    return withAuth(async (session) => {
        const ids = knowledgeBaseIds.split(',');
        const tags = await prisma.tag.findMany({
            where: {
                knowledgeBaseId: {
                    in: ids,
                },
            },
            include: {
                _count: {
                    select: {
                        documents: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return {
            success: true,
            data: tags.map(tag => [tag.name, tag._count.documents] as [string, number]),
        };
    });
}

export const removeTagAction = withAuth(async (session, knowledgeBaseId: string, tagIds: string[]) => {
    await prisma.tag.deleteMany({
        where: {
            knowledgeBaseId,
            id: {
                in: tagIds,
            },
        },
    });

    revalidatePath('/knowledge-base');
    return { success: true };
});

export const renameTagAction = withAuth(async (session, knowledgeBaseId: string, params: { oldName: string; newName: string }) => {
    const tag = await prisma.tag.update({
        where: {
            id: params.oldName,
        },
        data: {
            name: params.newName,
        },
    });

    revalidatePath('/knowledge-base');
    return { success: true, data: tag };
});

/**
 * 获取知识图谱数据
 * @param knowledgeBaseId 知识库ID
 * @returns 知识图谱数据
 */
export async function getKnowledgeGraphAction(knowledgeBaseId: string) {
    return withAuth(async (session) => {
        const documents = await prisma.document.findMany({
            where: {
                knowledgeBaseId,
            },
            include: {
                tags: true,
            },
        });

        const nodes = documents.map(doc => ({
            id: doc.id,
            name: doc.name,
            type: 'document',
        }));

        const edges = documents.flatMap(doc =>
            doc.tags.map(tag => ({
                source: doc.id,
                target: tag.id,
                type: 'has_tag',
            }))
        );

        return {
            success: true,
            data: {
                nodes,
                edges,
                graph: {},
                mind_map: {},
            },
        };
    });
}



/**
 * 获取不可见知识库
 * 如果不存在，则创建一个
 * @returns 不可见知识库信息
 */
export async function getInvisibleKnowledgeBase() {
    try {
        // 查找所有不可见的知识库
        const invisibleKnowledgeBases = await prisma.knowledgeBase.findMany({
            where: {
                visible: false
            },
            include: {
                documents: true
            }
        });

        // 如果找到不可见知识库，返回第一个
        if (invisibleKnowledgeBases.length > 0) {
            return {
                success: true,
                data: invisibleKnowledgeBases[0]
            };
        }

        // 如果没有找到不可见知识库，创建一个
        console.log('没有找到不可见知识库，正在创建一个...');

        const knowledgeBase = await prisma.knowledgeBase.create({
            data: {
                name: '不可见测试知识库',
                description: '这是一个不可见的测试知识库，用于测试知识库可见性功能',
                visible: false,
                create_date: new Date(),
                create_time: BigInt(Date.now()),
                created_by: 'system',
                update_date: new Date(),
                update_time: BigInt(Date.now()),
                similarity_threshold: 0.7,
                vector_similarity_weight: 0.5,
                status: 'active',
                parser_config: {},
                doc_num: 0,
                chunk_num: 0,
                token_num: 0,
                operator_permission: 0
            }
        });

        return {
            success: true,
            data: knowledgeBase
        };
    } catch (error) {
        console.error('获取不可见知识库失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '获取不可见知识库失败'
        };
    }
}

/**
 * 获取所有不可见知识库
 * @returns 所有不可见知识库列表
 */
export async function getAllInvisibleKnowledgeBases() {
    try {
        const invisibleKnowledgeBases = await prisma.knowledgeBase.findMany({
            where: {
                visible: false
            },
            include: {
                documents: true
            }
        });

        return {
            success: true,
            data: invisibleKnowledgeBases
        };
    } catch (error) {
        console.error('获取所有不可见知识库失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '获取所有不可见知识库失败'
        };
    }
}

/**
 * 获取不可见知识库
 * 如果不存在，则创建一个
 * @returns 不可见知识库信息
 */
export async function getInvisibleKnowledgeBaseAction(): Promise<ServerActionResponse<any>> {
    try {
        // 查找所有不可见的知识库
        const invisibleKnowledgeBases = await prisma.knowledgeBase.findMany({
            where: {
                visible: false
            },
            include: {
                documents: true
            }
        });

        // 如果找到不可见知识库，返回第一个
        if (invisibleKnowledgeBases.length > 0) {
            return {
                success: true,
                data: invisibleKnowledgeBases[0]
            };
        }

        // 如果没有找到不可见知识库，创建一个
        console.log('没有找到不可见知识库，正在创建一个...');

        const knowledgeBase = await prisma.knowledgeBase.create({
            data: {
                name: '不可见测试知识库',
                description: '这是一个不可见的测试知识库，用于测试知识库可见性功能',
                visible: false,
                create_date: new Date(),
                create_time: BigInt(Date.now()),
                created_by: 'system',
                update_date: new Date(),
                update_time: BigInt(Date.now()),
                similarity_threshold: 0.7,
                vector_similarity_weight: 0.5,
                status: 'active',
                parser_config: {},
                doc_num: 0,
                chunk_num: 0,
                token_num: 0,
                operator_permission: 0
            }
        });

        return {
            success: true,
            data: knowledgeBase
        };
    } catch (error) {
        console.error('获取不可见知识库失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '获取不可见知识库失败'
        };
    }
}

/**
 * 获取所有不可见知识库
 * @returns 所有不可见知识库列表
 */
export async function getAllInvisibleKnowledgeBasesAction(): Promise<ServerActionResponse<any>> {
    try {
        const invisibleKnowledgeBases = await prisma.knowledgeBase.findMany({
            where: {
                visible: false
            },
            include: {
                documents: true
            }
        });

        return {
            success: true,
            data: invisibleKnowledgeBases
        };
    } catch (error) {
        console.error('获取所有不可见知识库失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '获取所有不可见知识库失败'
        };
    }
} 