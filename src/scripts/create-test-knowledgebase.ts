import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // 创建不可见的测试知识库
        const knowledgeBase = await prisma.knowledgeBase.create({
            data: {
                name: '不可见测试知识库',
                description: '这是一个不可见的测试知识库，用于测试知识库可见性功能',
                visible: false,
                created_by: 'system',
                similarity_threshold: 0.7,
                vector_similarity_weight: 0.5,
                status: 'active',
                parser_config: {},
                doc_num: 0,
                chunk_num: 0,
                token_num: 0,
                operator_permission: 0,
                // created_at 和 updated_at 会自动设置（在 schema 中有 @default(now()) 和 @updatedAt）
            }
        });

        console.log('成功创建不可见测试知识库:', knowledgeBase);
    } catch (error) {
        console.error('创建知识库失败:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
